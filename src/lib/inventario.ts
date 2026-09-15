import "server-only";
import { prisma } from "@/lib/prisma";
import { toFechaCalendario } from "@/lib/fechas";
import { cantidadBaseDesdeCompra, costoPorUnidadBase } from "@/lib/motor/unidades";
import { recalcularLedger, type ResultadoLedger } from "@/lib/motor/ledger";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { ajusteFormSchema, type AjusteFormValues } from "@/lib/validaciones/ajuste";
import { ErrorValidacion } from "@/lib/apiAuth";

/**
 * Fecha de apertura del inventario: anterior a cualquier evento real posible.
 * Se usa solo como fecha del movimiento `saldo_inicial` de cada insumo.
 */
const FECHA_APERTURA = "2020-01-01";

/**
 * Recalcula el ledger completo (§6.3) a partir de todas las compras
 * recibidas, ajustes y ventas actuales en la base de datos — **sin
 * persistir**. Es la misma función pura (`recalcularLedger`, en
 * `@/lib/motor/ledger`) que usa `recalcularInventarioCompleto()`; existe por
 * separado para consumidores de solo lectura (ej. el Dashboard, que necesita
 * `cogsPorDiaProducto` — el costo real por día y producto que resuelve el
 * motor del ledger — sin tocar `movimientos_inventario`).
 */
export async function calcularLedgerActual(): Promise<ResultadoLedger> {
  const [insumos, compraLineas, ajustes, ventaLineas, recetaLineas] =
    await Promise.all([
      prisma.insumo.findMany({
        select: { id: true, stockInicial: true, costoInicial: true },
      }),
      prisma.compraLinea.findMany({
        where: { compra: { estado: "recibida" } },
        include: {
          compra: { select: { id: true, fechaRecepcion: true } },
          insumo: { select: { factorConversion: true } },
        },
      }),
      prisma.ajusteInventario.findMany({
        select: { id: true, insumoId: true, fecha: true, cantidadDelta: true },
      }),
      prisma.ventaLinea.findMany({
        select: {
          id: true,
          productoId: true,
          cantidad: true,
          venta: { select: { id: true, fecha: true } },
        },
      }),
      prisma.recetaLinea.findMany({
        select: {
          productoId: true,
          insumoId: true,
          cantidad: true,
          insumo: { select: { mermaPct: true } },
        },
      }),
    ]);

  return recalcularLedger({
    fechaApertura: FECHA_APERTURA,
    insumos: insumos.map((i) => ({
      insumoId: i.id,
      stockInicial: Number(i.stockInicial),
      costoInicial: Number(i.costoInicial),
    })),
    compraLineas: compraLineas.map((l) => {
      const factor = Number(l.insumo.factorConversion);
      const cantidadCompra = Number(l.cantidadRecibidaCompra ?? l.cantidadCompra);
      return {
        id: l.id,
        compraId: l.compra.id,
        insumoId: l.insumoId,
        fecha: toFechaCalendario(l.compra.fechaRecepcion!),
        cantidadBase: cantidadBaseDesdeCompra(cantidadCompra, factor),
        costoUnitarioBase: costoPorUnidadBase(Number(l.precioUnitarioCompra), factor),
      };
    }),
    ajustes: ajustes.map((a) => ({
      id: a.id,
      insumoId: a.insumoId,
      fecha: toFechaCalendario(a.fecha),
      cantidadDelta: Number(a.cantidadDelta),
    })),
    ventaLineas: ventaLineas.map((l) => ({
      id: l.id,
      ventaId: l.venta.id,
      fecha: toFechaCalendario(l.venta.fecha),
      productoId: l.productoId,
      cantidad: Number(l.cantidad),
    })),
    recetaLineas: recetaLineas.map((l) => ({
      productoId: l.productoId,
      insumoId: l.insumoId,
      cantidad: Number(l.cantidad),
      mermaPct: Number(l.insumo.mermaPct),
    })),
  });
}

/**
 * Reconstruye el ledger completo desde cero (§6.3) y reemplaza
 * `movimientos_inventario` con el resultado.
 *
 * Disparadores: crear, editar, anular o borrar cualquier compra, venta o
 * ajuste. En el volumen de datos de un restaurante esto toma milisegundos;
 * no se optimiza de forma incremental (regla explícita de la especificación).
 *
 * También sirve como el comando `recalcular-inventario` (arquitectura no
 * negociable §4): reconstruye la tabla materializada desde cero.
 */
export async function recalcularInventarioCompleto(): Promise<ResultadoLedger> {
  const resultado = await calcularLedgerActual();

  await prisma.$transaction([
    prisma.movimientoInventario.deleteMany({}),
    prisma.movimientoInventario.createMany({
      data: resultado.movimientos.map((m) => ({
        fecha: new Date(`${m.fecha}T00:00:00Z`),
        secuencia: m.secuencia,
        insumoId: m.insumoId,
        tipo: m.tipo,
        origenTabla: m.origenTabla,
        origenId: BigInt(m.origenId),
        cantidad: m.cantidad,
        costoUnitario: m.costoUnitario,
        costoMedioResultante: m.costoMedioResultante,
        stockResultante: m.stockResultante,
      })),
    }),
  ]);

  return resultado;
}

export interface EstadoInsumo {
  stock: number;
  costoMedio: number;
}

/**
 * Estado vigente (stock, costo medio) de cada insumo: el último movimiento
 * del ledger, o la carga inicial si todavía no tiene movimientos.
 */
export async function obtenerEstadoInsumos(): Promise<Map<number, EstadoInsumo>> {
  const insumos = await prisma.insumo.findMany({
    select: { id: true, stockInicial: true, costoInicial: true },
  });

  const mapa = new Map<number, EstadoInsumo>(
    insumos.map((i) => [
      i.id,
      { stock: Number(i.stockInicial), costoMedio: Number(i.costoInicial) },
    ])
  );

  const ultimos = await prisma.$queryRaw<
    { insumoId: number; stockResultante: unknown; costoMedioResultante: unknown }[]
  >`
    SELECT DISTINCT ON (insumo_id)
      insumo_id AS "insumoId",
      stock_resultante AS "stockResultante",
      costo_medio_resultante AS "costoMedioResultante"
    FROM movimientos_inventario
    ORDER BY insumo_id, fecha DESC, secuencia DESC, id DESC
  `;

  for (const u of ultimos) {
    mapa.set(u.insumoId, {
      stock: Number(u.stockResultante),
      costoMedio: Number(u.costoMedioResultante),
    });
  }

  return mapa;
}

const TAMANO_PAGINA_MOVIMIENTOS = 50;

export async function listarInsumosBasico() {
  return prisma.insumo.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, unidadBase: true },
  });
}

export async function listarMovimientos(insumoId: number | null, pagina: number) {
  const [total, movimientos] = await Promise.all([
    prisma.movimientoInventario.count({ where: insumoId ? { insumoId } : undefined }),
    prisma.movimientoInventario.findMany({
      where: insumoId ? { insumoId } : undefined,
      include: { insumo: { select: { nombre: true, unidadBase: true } } },
      orderBy: [{ fecha: "desc" }, { secuencia: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * TAMANO_PAGINA_MOVIMIENTOS,
      take: TAMANO_PAGINA_MOVIMIENTOS,
    }),
  ]);
  // id/origenId son BigInt en la base — no serializan en JSON (API) ni cruzan
  // el límite server/client de React sin convertir primero a string.
  const movimientosSerializables = movimientos.map((m) => ({
    ...m,
    id: m.id.toString(),
    origenId: m.origenId.toString(),
  }));
  return {
    movimientos: movimientosSerializables,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANO_PAGINA_MOVIMIENTOS)),
  };
}

export async function listarAjustesRecientes() {
  return prisma.ajusteInventario.findMany({
    include: { insumo: { select: { nombre: true, unidadBase: true } }, usuario: true },
    orderBy: { fecha: "desc" },
    take: 20,
  });
}

export async function crearAjuste(datos: AjusteFormValues) {
  const parsed = ajusteFormSchema.safeParse(datos);
  if (!parsed.success) throw new ErrorValidacion(parsed.error.flatten().fieldErrors);

  const usuarioId = await obtenerUsuarioActualId();

  await prisma.ajusteInventario.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      insumoId: parsed.data.insumoId,
      cantidadDelta: parsed.data.cantidadDelta,
      motivo: parsed.data.motivo,
      nota: parsed.data.nota || null,
      usuarioId,
    },
  });

  await recalcularInventarioCompleto();
}
