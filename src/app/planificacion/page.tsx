import { prisma } from "@/lib/prisma";
import { fechaLocalAhora } from "@/lib/fechas";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { construirSeriesHistoricas } from "@/lib/planificacion";
import { obtenerParametros } from "@/lib/parametros";
import { sumarDiasStr, HORIZONTES_DISPONIBLES } from "@/lib/planificacionConstantes";
import {
  ajustarModelo,
  aplicarOverrides,
  backtestear,
  calcularNivelConfianza,
  construirSerie,
  pronosticarDia,
} from "@/lib/motor/pronostico";
import { calcularSugerenciaCompra, type SugerenciaCompra } from "@/lib/motor/mrp";
import { calcularCargaCocina, type DemandaProductoDia } from "@/lib/motor/cocina";
import { PageHeader } from "@/components/page-header";
import { HorizonteSelector } from "./horizonte-selector";
import { PronosticoSeccion, type FilaPronostico, type PuntoSerieAgregada } from "./pronostico-seccion";
import { MrpSeccion, type GrupoProveedorMrp } from "./mrp-seccion";
import { CargaCocinaSeccion } from "./carga-cocina-chart";

export default async function PlanificacionPage(props: PageProps<"/planificacion">) {
  const searchParams = await props.searchParams;
  const parametros = await obtenerParametros();
  const horizonteParam = Number(searchParams.horizonte);
  const horizonte = (HORIZONTES_DISPONIBLES as readonly number[]).includes(horizonteParam)
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
      cantidad: modelo
        ? pronosticarDia(modelo, new Date(`${fecha}T00:00:00Z`).getUTCDay())
        : 0,
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

  return (
    <div>
      <PageHeader
        title="Planificación"
        description="Pronóstico de demanda, sugerencia de compra (MRP) y carga de cocina."
        actions={<HorizonteSelector horizonte={horizonte} />}
      />

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">Pronóstico de demanda</h2>
        <PronosticoSeccion filas={filasPronostico} serieAgregada={serieAgregada} hoy={hoy} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">Sugerencia de compra</h2>
        <MrpSeccion grupos={Array.from(gruposPorProveedor.values())} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Carga de cocina</h2>
        <CargaCocinaSeccion dias={cargaCocina} capacidadMinutosDia={parametros.capacidadMinutosDia} />
      </section>
    </div>
  );
}
