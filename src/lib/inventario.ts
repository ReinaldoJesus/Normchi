import "server-only";
import { prisma } from "@/lib/prisma";
import { toFechaCalendario } from "@/lib/fechas";
import { cantidadBaseDesdeCompra, costoPorUnidadBase } from "@/lib/motor/unidades";
import { recalcularLedger, type ResultadoLedger } from "@/lib/motor/ledger";

/**
 * Fecha de apertura del inventario: anterior a cualquier evento real posible.
 * Se usa solo como fecha del movimiento `saldo_inicial` de cada insumo.
 */
const FECHA_APERTURA = "2020-01-01";

/**
 * Reconstruye el ledger completo desde cero (§6.3) a partir de todas las
 * compras recibidas, ajustes y ventas actuales en la base de datos, y
 * reemplaza `movimientos_inventario` con el resultado.
 *
 * Disparadores: crear, editar, anular o borrar cualquier compra, venta o
 * ajuste. En el volumen de datos de un restaurante esto toma milisegundos;
 * no se optimiza de forma incremental (regla explícita de la especificación).
 *
 * También sirve como el comando `recalcular-inventario` (arquitectura no
 * negociable §4): reconstruye la tabla materializada desde cero.
 */
export async function recalcularInventarioCompleto(): Promise<ResultadoLedger> {
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

  const resultado = recalcularLedger({
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
