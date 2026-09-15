import "server-only";
import { prisma } from "@/lib/prisma";
import { toFechaCalendario, fechaLocalAhora } from "@/lib/fechas";
import { obtenerParametros } from "@/lib/parametros";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import type { DiaHistorico, NivelConfianza, PuntoPronostico } from "@/lib/motor/pronostico";
import {
  ajustarModelo,
  aplicarOverrides,
  backtestear,
  calcularNivelConfianza,
  construirSerie,
  pronosticarDia,
} from "@/lib/motor/pronostico";
import { calcularSugerenciaCompra, type SugerenciaCompra } from "@/lib/motor/mrp";
import { calcularCargaCocina } from "@/lib/motor/cocina";
import type { DemandaProductoDia, CargaDia } from "@/lib/motor/cocina";
import { sumarDiasStr, HORIZONTES_DISPONIBLES } from "@/lib/planificacionConstantes";
import { overrideFormSchema, type OverrideFormValues } from "@/lib/validaciones/forecastOverride";
import { crearCompra } from "@/lib/services/compras";
import { ErrorValidacion } from "@/lib/apiAuth";

export interface ProductoPlanificable {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  tiempoPreparacionMin: number;
  estacion: string | null;
}

export interface DatosHistoricos {
  productos: ProductoPlanificable[];
  seriesPorProducto: Map<number, DiaHistorico[]>;
}

/**
 * Construye, para cada producto activo, la serie diaria de los últimos
 * `ventanaDias` (hasta ayer inclusive — hoy todavía no está "cerrado").
 * Distingue día operado+registrado sin venta (u_t=0), día no operado
 * (excluido) y día operado sin registrar (excluido, cuenta como brecha).
 * Ver especificación §6.6 paso 1.
 */
export async function construirSeriesHistoricas(
  diasOperacionSemana: number[],
  ventanaDias: number
): Promise<DatosHistoricos> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -ventanaDias);

  const [productos, ventas, diasCierre] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.venta.findMany({
      where: {
        fecha: {
          gte: new Date(`${inicio}T00:00:00Z`),
          lt: new Date(`${hoy}T00:00:00Z`),
        },
      },
      include: { lineas: true },
    }),
    prisma.diaCierre.findMany({
      where: {
        fecha: {
          gte: new Date(`${inicio}T00:00:00Z`),
          lt: new Date(`${hoy}T00:00:00Z`),
        },
      },
    }),
  ]);

  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  const ventaPorFecha = new Map<string, Map<number, number>>();
  for (const v of ventas) {
    const fecha = toFechaCalendario(v.fecha);
    const mapa = ventaPorFecha.get(fecha) ?? new Map<number, number>();
    for (const l of v.lineas) {
      mapa.set(l.productoId, (mapa.get(l.productoId) ?? 0) + Number(l.cantidad));
    }
    ventaPorFecha.set(fecha, mapa);
  }

  const dias: { fecha: string; dow: number }[] = [];
  for (let cursor = inicio; cursor < hoy; cursor = sumarDiasStr(cursor, 1)) {
    dias.push({ fecha: cursor, dow: new Date(`${cursor}T00:00:00Z`).getUTCDay() });
  }

  const seriesPorProducto = new Map<number, DiaHistorico[]>();
  for (const p of productos) {
    const serie: DiaHistorico[] = dias.map(({ fecha, dow }) => {
      const operativo = diasOperacionSemana.includes(dow) && !fechasCierre.has(fecha);
      const ventasDia = ventaPorFecha.get(fecha);
      const registrado = ventasDia !== undefined;
      return {
        fecha,
        dow,
        operativo,
        registrado,
        cantidadVendida: registrado ? (ventasDia!.get(p.id) ?? 0) : undefined,
      };
    });
    seriesPorProducto.set(p.id, serie);
  }

  return {
    productos: productos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      tiempoPreparacionMin: Number(p.tiempoPreparacionMin),
      estacion: p.estacion,
    })),
    seriesPorProducto,
  };
}

export interface FilaPronostico {
  productoId: number;
  nombre: string;
  categoria: "comida" | "bebida";
  diasConDatos: number;
  coberturaRegistro: number;
  wape?: number;
  confianza: NivelConfianza;
  pronosticoTotal: number;
  puntos: PuntoPronostico[];
}

export interface PuntoSerieAgregada {
  fecha: string;
  real?: number;
  proyectado?: number;
}

export interface LineaMrp {
  insumoId: number;
  insumoNombre: string;
  unidadCompra: string;
  stockActual: number;
  coberturaDias: number;
  fechaQuiebre: string | null;
  fechaPedido: string | null;
  urgente: boolean;
  cantidadSugerida: number;
  costoMedio: number;
  factorConversion: number;
  costoEstimado: number;
}

export interface GrupoProveedorMrp {
  proveedorId: number | null;
  proveedorNombre: string;
  lineas: LineaMrp[];
}

export interface DatosPlanificacion {
  horizonte: number;
  hoy: string;
  filasPronostico: FilaPronostico[];
  serieAgregada: PuntoSerieAgregada[];
  grupos: GrupoProveedorMrp[];
  cargaCocina: CargaDia[];
  capacidadMinutosDia: number;
}

/**
 * Orquesta pronóstico (§6.6), MRP (§6.7) y carga de cocina (§6.8) para el
 * horizonte pedido. Antes vivía inline en planificacion/page.tsx — se movió
 * aquí para que la API (GET /api/planificacion) y el Server Component usen
 * exactamente el mismo cálculo.
 */
export async function obtenerPlanificacion(horizonteParam?: number): Promise<DatosPlanificacion> {
  const parametros = await obtenerParametros();
  const horizonte =
    horizonteParam && (HORIZONTES_DISPONIBLES as readonly number[]).includes(horizonteParam)
      ? horizonteParam
      : parametros.horizontePlanificacionDias;

  const hoy = fechaLocalAhora();
  const horizonFechas = Array.from({ length: horizonte }, (_, i) => sumarDiasStr(hoy, i));

  const [{ productos, seriesPorProducto }, estadoPorInsumo, insumos, recetaLineas, comprasPendientes, overrides] =
    await Promise.all([
      construirSeriesHistoricas(parametros.diasOperacionSemana, parametros.ventanaHistorialDias),
      obtenerEstadoInsumos(),
      prisma.insumo.findMany({
        where: { activo: true },
        include: { proveedor: { select: { id: true, nombre: true } } },
        orderBy: { nombre: "asc" },
      }),
      prisma.recetaLinea.findMany({
        include: { insumo: { select: { mermaPct: true } } },
      }),
      prisma.compraLinea.findMany({
        where: { compra: { estado: "pendiente" } },
        include: {
          compra: { select: { fechaEsperada: true } },
          insumo: { select: { factorConversion: true } },
        },
      }),
      prisma.forecastOverride.findMany(),
    ]);

  // --- Pronóstico por producto (§6.6) ---------------------------------------
  const forecastPorProductoFecha = new Map<number, Map<string, number>>();
  const filasPronostico: FilaPronostico[] = [];

  for (const p of productos) {
    const diasHistoricos = seriesPorProducto.get(p.id) ?? [];
    const serie = construirSerie(diasHistoricos);
    const modelo = ajustarModelo(serie.observaciones, parametros.alphaSuavizamiento);
    const backtest = backtestear(diasHistoricos, 14, parametros.alphaSuavizamiento);
    const confianza = calcularNivelConfianza({
      diasConDatos: serie.observaciones.length,
      coberturaRegistro: serie.coberturaRegistro,
      wape: backtest?.wape,
    });

    const base = horizonFechas.map((fecha) => ({
      fecha,
      cantidad: modelo ? pronosticarDia(modelo, new Date(`${fecha}T00:00:00Z`).getUTCDay()) : 0,
    }));
    const overridesProducto = overrides
      .filter((o) => o.productoId === p.id)
      .map((o) => ({
        fecha: o.fecha.toISOString().slice(0, 10),
        cantidad: Number(o.cantidad),
        motivo: o.motivo ?? undefined,
      }));
    const puntos = aplicarOverrides(base, overridesProducto);

    const mapaFecha = new Map(puntos.map((pt) => [pt.fecha, pt.cantidad]));
    forecastPorProductoFecha.set(p.id, mapaFecha);

    filasPronostico.push({
      productoId: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      diasConDatos: serie.observaciones.length,
      coberturaRegistro: serie.coberturaRegistro,
      wape: backtest?.wape,
      confianza,
      pronosticoTotal: puntos.reduce((acc, pt) => acc + pt.cantidad, 0),
      puntos,
    });
  }

  // Serie agregada (todas las categorías) para el gráfico histórico + proyección.
  const diasGrafico = 30;
  const serieAgregada: PuntoSerieAgregada[] = [];
  const primeraSerie = productos.length > 0 ? (seriesPorProducto.get(productos[0].id) ?? []) : [];
  const diasRecientes = primeraSerie.slice(-diasGrafico);
  for (const dia of diasRecientes) {
    const total = productos.reduce((acc, p) => {
      const d = (seriesPorProducto.get(p.id) ?? []).find((x) => x.fecha === dia.fecha);
      return acc + (d?.cantidadVendida ?? 0);
    }, 0);
    serieAgregada.push({ fecha: dia.fecha, real: total });
  }
  for (const fecha of horizonFechas) {
    const total = productos.reduce(
      (acc, p) => acc + (forecastPorProductoFecha.get(p.id)?.get(fecha) ?? 0),
      0
    );
    serieAgregada.push({ fecha, proyectado: total });
  }

  // --- MRP (§6.7) ------------------------------------------------------------
  const recetaPorInsumo = new Map<number, typeof recetaLineas>();
  for (const l of recetaLineas) {
    const lista = recetaPorInsumo.get(l.insumoId) ?? [];
    lista.push(l);
    recetaPorInsumo.set(l.insumoId, lista);
  }
  const comprasPendientesPorInsumo = new Map<number, { fecha: string; cantidadBase: number }[]>();
  for (const l of comprasPendientes) {
    const fecha = l.compra.fechaEsperada.toISOString().slice(0, 10);
    const cantidadBase = Number(l.cantidadCompra) * Number(l.insumo.factorConversion);
    const lista = comprasPendientesPorInsumo.get(l.insumoId) ?? [];
    lista.push({ fecha, cantidadBase });
    comprasPendientesPorInsumo.set(l.insumoId, lista);
  }

  const gruposPorProveedor = new Map<string, GrupoProveedorMrp>();
  for (const insumo of insumos) {
    const lineasReceta = recetaPorInsumo.get(insumo.id) ?? [];
    if (lineasReceta.length === 0) continue;

    const requerimientos = horizonFechas.map((fecha) => ({
      fecha,
      requerimiento: lineasReceta.reduce((acc, l) => {
        const forecast = forecastPorProductoFecha.get(l.productoId)?.get(fecha) ?? 0;
        return acc + forecast * Number(l.cantidad) * (1 + Number(l.insumo.mermaPct));
      }, 0),
    }));

    const estado = estadoPorInsumo.get(insumo.id);
    const sugerencia: SugerenciaCompra = calcularSugerenciaCompra({
      insumoId: insumo.id,
      stockActual: estado?.stock ?? Number(insumo.stockInicial),
      stockSeguridad: Number(insumo.stockSeguridad),
      leadTimeDias: insumo.leadTimeDias,
      loteMinimoCompra: Number(insumo.loteMinimoCompra),
      factorConversion: Number(insumo.factorConversion),
      costoMedio: estado?.costoMedio ?? Number(insumo.costoInicial),
      requerimientos,
      entradasProgramadas: comprasPendientesPorInsumo.get(insumo.id) ?? [],
      hoy,
    });

    if (sugerencia.cantidadFinal <= 0) continue;

    const claveProveedor = insumo.proveedorId ? String(insumo.proveedorId) : "sin_proveedor";
    const grupo = gruposPorProveedor.get(claveProveedor) ?? {
      proveedorId: insumo.proveedorId,
      proveedorNombre: insumo.proveedor?.nombre ?? "Sin proveedor asignado",
      lineas: [],
    };
    grupo.lineas.push({
      insumoId: insumo.id,
      insumoNombre: insumo.nombre,
      unidadCompra: insumo.unidadCompra,
      stockActual: estado?.stock ?? 0,
      coberturaDias: sugerencia.coberturaDias,
      fechaQuiebre: sugerencia.fechaQuiebre,
      fechaPedido: sugerencia.fechaPedido,
      urgente: sugerencia.urgente,
      cantidadSugerida: sugerencia.cantidadFinal,
      costoMedio: estado?.costoMedio ?? Number(insumo.costoInicial),
      factorConversion: Number(insumo.factorConversion),
      costoEstimado: sugerencia.costoEstimado,
    });
    gruposPorProveedor.set(claveProveedor, grupo);
  }

  // --- Carga de cocina (§6.8) --------------------------------------------------
  const demanda: DemandaProductoDia[] = [];
  for (const fecha of horizonFechas) {
    for (const p of productos) {
      const cantidad = forecastPorProductoFecha.get(p.id)?.get(fecha) ?? 0;
      if (cantidad <= 0) continue;
      demanda.push({
        fecha,
        productoId: p.id,
        cantidadPronosticada: cantidad,
        tiempoPreparacionMin: p.tiempoPreparacionMin,
        estacion: p.estacion,
      });
    }
  }
  const cargaCocina = calcularCargaCocina(demanda, parametros.capacidadMinutosDia);

  return {
    horizonte,
    hoy,
    filasPronostico,
    serieAgregada,
    grupos: Array.from(gruposPorProveedor.values()),
    cargaCocina,
    capacidadMinutosDia: parametros.capacidadMinutosDia,
  };
}

export async function crearOverride(datos: OverrideFormValues) {
  const parsed = overrideFormSchema.safeParse(datos);
  if (!parsed.success) throw new ErrorValidacion(parsed.error.flatten().fieldErrors);

  return prisma.forecastOverride.upsert({
    where: {
      productoId_fecha: { productoId: parsed.data.productoId, fecha: new Date(parsed.data.fecha) },
    },
    update: { cantidad: parsed.data.cantidad, motivo: parsed.data.motivo || null },
    create: {
      productoId: parsed.data.productoId,
      fecha: new Date(parsed.data.fecha),
      cantidad: parsed.data.cantidad,
      motivo: parsed.data.motivo || null,
    },
  });
}

export async function eliminarOverride(id: number) {
  await prisma.forecastOverride.delete({ where: { id } });
}

export interface LineaSugerenciaInput {
  insumoId: number;
  cantidadCompra: number;
  precioUnitarioCompra: number;
}

export async function generarOrdenDesdeSugerencia(
  proveedorId: number,
  lineas: LineaSugerenciaInput[]
) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) throw new ErrorValidacion({ proveedorId: ["Proveedor no encontrado."] });

  const hoy = fechaLocalAhora();
  const dHoy = new Date(`${hoy}T00:00:00Z`);
  dHoy.setUTCDate(dHoy.getUTCDate() + proveedor.leadTimeDias);
  const fechaEsperada = dHoy.toISOString().slice(0, 10);

  return crearCompra({
    proveedorId,
    fechaEmision: hoy,
    fechaEsperada,
    documento: "",
    nota: "Generada desde la sugerencia de compra (Planificación).",
    lineas,
  });
}
