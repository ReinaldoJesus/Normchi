import "server-only";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { toFechaCalendario } from "@/lib/fechas";
import { calcularCostoTeoricoPorProducto } from "@/lib/costeoActual";
import { cierreDiaSchema, CANALES_VENTA, type CierreDiaValues } from "@/lib/validaciones/venta";
import { ErrorApi, ErrorValidacion } from "@/lib/apiAuth";
import type { CanalVenta } from "@/generated/prisma";

const CANALES: CanalVenta[] = ["salon", "delivery", "retiro"];

export interface ProductoCierre {
  id: number;
  nombre: string;
  categoria: "comida" | "bebida";
  precioVenta: number;
  costoTeorico: number;
  cantidadInicial: number | null;
}

export async function obtenerDatosCierreDia(fecha: string, canalParam: string) {
  const canal: CanalVenta = CANALES.includes(canalParam as CanalVenta)
    ? (canalParam as CanalVenta)
    : "salon";
  const fechaDate = new Date(`${fecha}T00:00:00Z`);

  const [productos, costoTeoricoPorProducto, ventaExistente, diaCierre] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    calcularCostoTeoricoPorProducto(),
    prisma.venta.findFirst({ where: { fecha: fechaDate, canal }, include: { lineas: true } }),
    prisma.diaCierre.findUnique({ where: { fecha: fechaDate } }),
  ]);

  const cantidadPorProducto = new Map(
    ventaExistente?.lineas.map((l) => [l.productoId, Number(l.cantidad)]) ?? []
  );
  const precioPorProducto = new Map(
    ventaExistente?.lineas.map((l) => [l.productoId, Number(l.precioUnitario)]) ?? []
  );

  const productosCierre: ProductoCierre[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precioVenta: precioPorProducto.get(p.id) ?? Number(p.precioVenta),
    costoTeorico: costoTeoricoPorProducto.get(p.id) ?? 0,
    cantidadInicial: cantidadPorProducto.get(p.id) ?? null,
  }));

  return {
    canal,
    dow: fechaDate.getUTCDay(),
    productos: productosCierre,
    diaCerrado: diaCierre ? { motivo: diaCierre.motivo } : null,
    yaRegistrado: Boolean(ventaExistente),
  };
}

export async function listarHistorialVentas(mes: string) {
  const inicioMes = new Date(`${mes}-01T00:00:00Z`);
  const finMes = new Date(inicioMes);
  finMes.setUTCMonth(finMes.getUTCMonth() + 1);

  const [ventas, diasCierre, costoTeoricoPorProducto] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: inicioMes, lt: finMes } },
      include: { lineas: { include: { producto: { select: { categoria: true } } } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.diaCierre.findMany({ where: { fecha: { gte: inicioMes, lt: finMes } } }),
    calcularCostoTeoricoPorProducto(),
  ]);

  const filas = ventas.map((v) => {
    let unidadesComida = 0;
    let unidadesBebida = 0;
    let ingreso = 0;
    let margen = 0;
    for (const l of v.lineas) {
      const cantidad = Number(l.cantidad);
      const ingresoLinea = cantidad * Number(l.precioUnitario);
      const costoLinea = cantidad * (costoTeoricoPorProducto.get(l.productoId) ?? 0);
      ingreso += ingresoLinea;
      margen += ingresoLinea - costoLinea;
      if (l.producto.categoria === "bebida") unidadesBebida += cantidad;
      else unidadesComida += cantidad;
    }
    return {
      id: v.id,
      fecha: toFechaCalendario(v.fecha),
      canal: v.canal,
      unidadesComida,
      unidadesBebida,
      ingreso,
      margen,
    };
  });

  return {
    filas,
    fechasRegistradas: Array.from(new Set(ventas.map((v) => toFechaCalendario(v.fecha)))),
    fechasCierre: Array.from(new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)))),
  };
}

export interface ResumenCategoria {
  unidades: number;
  ingreso: number;
  costo: number;
  margen: number;
}

export interface AlertaStock {
  insumoId: number;
  nombre: string;
  stock: number;
  stockSeguridad: number;
  unidadBase: string;
}

export interface ResumenCierreDia {
  ingreso: number;
  costo: number;
  margen: number;
  comida: ResumenCategoria;
  bebida: ResumenCategoria;
  alertas: AlertaStock[];
}

function resumenVacio(): ResumenCategoria {
  return { unidades: 0, ingreso: 0, costo: 0, margen: 0 };
}

export async function guardarCierreDia(datos: CierreDiaValues): Promise<ResumenCierreDia> {
  const parsed = cierreDiaSchema.safeParse(datos);
  if (!parsed.success) throw new ErrorValidacion(parsed.error.flatten().fieldErrors);
  const { fecha, canal, lineas } = parsed.data;

  const cierre = await prisma.diaCierre.findUnique({ where: { fecha: new Date(fecha) } });
  if (cierre) {
    throw new ErrorApi(400, "Este día está marcado como cierre. Reábrelo antes de registrar ventas.");
  }

  const usuarioId = await obtenerUsuarioActualId();
  const existente = await prisma.venta.findFirst({ where: { fecha: new Date(fecha), canal } });

  await prisma.$transaction(async (tx) => {
    let ventaId: number;
    if (existente) {
      ventaId = existente.id;
      await tx.ventaLinea.deleteMany({ where: { ventaId } });
    } else {
      const venta = await tx.venta.create({
        data: { fecha: new Date(fecha), canal, origen: "manual", creadoPor: usuarioId },
      });
      ventaId = venta.id;
    }
    await tx.ventaLinea.createMany({
      data: lineas.map((l) => ({
        ventaId,
        productoId: l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
    });
  });

  const resultadoLedger = await recalcularInventarioCompleto();

  const productos = await prisma.producto.findMany({
    where: { id: { in: lineas.map((l) => l.productoId) } },
    select: { id: true, categoria: true },
  });
  const categoriaPorProducto = new Map(productos.map((p) => [p.id, p.categoria]));

  const cogsPorProducto = new Map(
    resultadoLedger.cogsPorDiaProducto
      .filter((c) => c.fecha === fecha)
      .map((c) => [c.productoId, c.cogs])
  );

  const comida = resumenVacio();
  const bebida = resumenVacio();

  for (const l of lineas) {
    const categoria = categoriaPorProducto.get(l.productoId);
    const bucket = categoria === "bebida" ? bebida : comida;
    const ingresoLinea = l.cantidad * l.precioUnitario;
    const costoLinea = cogsPorProducto.get(l.productoId) ?? 0;
    bucket.unidades += l.cantidad;
    bucket.ingreso += ingresoLinea;
    bucket.costo += costoLinea;
    bucket.margen += ingresoLinea - costoLinea;
  }

  const insumosTocados = new Set(
    resultadoLedger.movimientos
      .filter((m) => m.fecha === fecha && m.tipo === "consumo_venta")
      .map((m) => m.insumoId)
  );
  const insumosInfo =
    insumosTocados.size > 0
      ? await prisma.insumo.findMany({
          where: { id: { in: Array.from(insumosTocados) } },
          select: { id: true, nombre: true, stockSeguridad: true, unidadBase: true },
        })
      : [];
  const alertas: AlertaStock[] = insumosInfo
    .map((i) => ({
      insumoId: i.id,
      nombre: i.nombre,
      stock: resultadoLedger.stockFinal[i.id] ?? 0,
      stockSeguridad: Number(i.stockSeguridad),
      unidadBase: i.unidadBase,
    }))
    .filter((a) => a.stock < a.stockSeguridad);

  return {
    ingreso: comida.ingreso + bebida.ingreso,
    costo: comida.costo + bebida.costo,
    margen: comida.margen + bebida.margen,
    comida,
    bebida,
    alertas,
  };
}

export async function marcarDiaSinOperacion(fecha: string, motivo: string) {
  const ventaExistente = await prisma.venta.findFirst({ where: { fecha: new Date(fecha) } });
  if (ventaExistente) {
    throw new ErrorApi(400, "Ya hay ventas registradas ese día; no se puede marcar como cierre.");
  }

  const usuarioId = await obtenerUsuarioActualId();
  await prisma.diaCierre.upsert({
    where: { fecha: new Date(fecha) },
    update: { motivo: motivo || null, usuarioId },
    create: { fecha: new Date(fecha), motivo: motivo || null, usuarioId },
  });
}

export async function reabrirDia(fecha: string) {
  await prisma.diaCierre.deleteMany({ where: { fecha: new Date(fecha) } });
}

export interface FilaCsvVenta {
  fecha: string;
  codigoProducto: string;
  cantidad: string;
  precioUnitario: string;
  canal: string;
}

export interface ErrorFilaCsv {
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacionCsv {
  totalFilas: number;
  filasValidas: number;
  errores: ErrorFilaCsv[];
  diasImportados: number;
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function importarVentasCsv(filas: FilaCsvVenta[]): Promise<ResultadoImportacionCsv> {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true },
  });
  const idPorCodigo = new Map(productos.map((p) => [p.codigo, p.id]));

  const diasCierre = await prisma.diaCierre.findMany({ select: { fecha: true } });
  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  const errores: ErrorFilaCsv[] = [];
  interface FilaValida {
    fecha: string;
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    canal: (typeof CANALES_VENTA)[number];
  }
  const validas: FilaValida[] = [];

  filas.forEach((f, i) => {
    const numeroFila = i + 2;
    if (!RE_FECHA.test(f.fecha)) {
      errores.push({ fila: numeroFila, mensaje: `Fecha inválida: "${f.fecha}"` });
      return;
    }
    if (fechasCierre.has(f.fecha)) {
      errores.push({ fila: numeroFila, mensaje: `${f.fecha} está marcado como día de cierre` });
      return;
    }
    const productoId = idPorCodigo.get(f.codigoProducto);
    if (!productoId) {
      errores.push({ fila: numeroFila, mensaje: `Producto inexistente: "${f.codigoProducto}"` });
      return;
    }
    const cantidad = Number(f.cantidad);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      errores.push({ fila: numeroFila, mensaje: `Cantidad no numérica: "${f.cantidad}"` });
      return;
    }
    const precioUnitario = Number(f.precioUnitario);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      errores.push({ fila: numeroFila, mensaje: `Precio unitario no numérico: "${f.precioUnitario}"` });
      return;
    }
    if (!CANALES_VENTA.includes(f.canal as (typeof CANALES_VENTA)[number])) {
      errores.push({ fila: numeroFila, mensaje: `Canal desconocido: "${f.canal}"` });
      return;
    }

    validas.push({
      fecha: f.fecha,
      productoId,
      cantidad,
      precioUnitario,
      canal: f.canal as (typeof CANALES_VENTA)[number],
    });
  });

  const grupos = new Map<string, FilaValida[]>();
  for (const fila of validas) {
    const clave = `${fila.fecha}|${fila.canal}`;
    const lista = grupos.get(clave) ?? [];
    lista.push(fila);
    grupos.set(clave, lista);
  }

  if (grupos.size > 0) {
    const usuarioId = await obtenerUsuarioActualId();

    await prisma.$transaction(async (tx) => {
      for (const [, filasGrupo] of grupos) {
        const { fecha, canal } = filasGrupo[0];

        let venta = await tx.venta.findFirst({ where: { fecha: new Date(fecha), canal } });
        if (!venta) {
          venta = await tx.venta.create({
            data: { fecha: new Date(fecha), canal, origen: "csv", creadoPor: usuarioId },
          });
        }

        const porProducto = new Map<number, { cantidad: number; precioUnitario: number }>();
        for (const f of filasGrupo) {
          const actual = porProducto.get(f.productoId);
          porProducto.set(f.productoId, {
            cantidad: (actual?.cantidad ?? 0) + f.cantidad,
            precioUnitario: f.precioUnitario,
          });
        }

        for (const [productoId, valores] of porProducto) {
          const lineaExistente = await tx.ventaLinea.findFirst({
            where: { ventaId: venta.id, productoId },
          });
          if (lineaExistente) {
            await tx.ventaLinea.update({ where: { id: lineaExistente.id }, data: valores });
          } else {
            await tx.ventaLinea.create({ data: { ventaId: venta.id, productoId, ...valores } });
          }
        }
      }
    });

    await recalcularInventarioCompleto();
  }

  return {
    totalFilas: filas.length,
    filasValidas: validas.length,
    errores,
    diasImportados: grupos.size,
  };
}
