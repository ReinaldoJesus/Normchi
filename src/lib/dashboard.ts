import "server-only";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora, toFechaCalendario } from "@/lib/fechas";
import { sumarDiasStr } from "@/lib/planificacionConstantes";
import { obtenerParametros } from "@/lib/parametros";
import { calcularLedgerActual, obtenerEstadoInsumos } from "@/lib/inventario";
import { obtenerPlanificacion } from "@/lib/planificacion";
import { listarProductosConCosteo } from "@/lib/services/productos";
import { calcularPrecioVentaNeto } from "@/lib/motor/recetas";

export type PeriodoDashboard = "hoy" | "7d" | "30d" | "mes";

export interface DesgloseCategoria {
  comida: number;
  bebida: number;
  total: number;
}

export interface PuntoSerieVentas {
  fecha: string;
  real?: number;
  proyectado?: number;
}

export interface AlertaDashboard {
  tipo:
    | "quiebre"
    | "stock_negativo"
    | "recepcion_vencida"
    | "stock_bajo"
    | "food_cost"
    | "carga_cocina";
  urgente: boolean;
  mensaje: string;
  href: string;
}

export interface DatosDashboard {
  periodo: PeriodoDashboard;
  inicio: string;
  fin: string;
  hoy: string;
  ventasNetas: DesgloseCategoria;
  costoMateriaPrima: DesgloseCategoria;
  foodCostPct: DesgloseCategoria;
  margenBruto: DesgloseCategoria;
  valorInventario: number;
  comprasPeriodo: number;
  utilidadEstimada: number;
  mix: {
    comidaPct: number;
    bebidaPct: number;
    comidaPctAnterior: number;
    bebidaPctAnterior: number;
  };
  serieVentas: PuntoSerieVentas[];
  alertas: AlertaDashboard[];
}

function rangoDelPeriodo(periodo: PeriodoDashboard, hoy: string) {
  let dias: number;
  let inicio: string;

  if (periodo === "hoy") {
    dias = 1;
    inicio = hoy;
  } else if (periodo === "7d") {
    dias = 7;
    inicio = sumarDiasStr(hoy, -6);
  } else if (periodo === "30d") {
    dias = 30;
    inicio = sumarDiasStr(hoy, -29);
  } else {
    inicio = `${hoy.slice(0, 7)}-01`;
    dias =
      Math.floor(
        (new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${inicio}T00:00:00Z`).getTime()) /
          86400000
      ) + 1;
  }

  const finAnterior = sumarDiasStr(inicio, -1);
  const inicioAnterior = sumarDiasStr(inicio, -dias);

  return { inicio, fin: hoy, dias, inicioAnterior, finAnterior };
}

function desgloseVacio(): DesgloseCategoria {
  return { comida: 0, bebida: 0, total: 0 };
}

function acumular(destino: DesgloseCategoria, categoria: "comida" | "bebida", monto: number) {
  destino[categoria] += monto;
  destino.total += monto;
}

export async function obtenerDashboard(periodo: PeriodoDashboard): Promise<DatosDashboard> {
  const hoy = fechaLocalAhora();
  const { inicio, fin, dias, inicioAnterior, finAnterior } = rangoDelPeriodo(periodo, hoy);

  const [
    parametros,
    productos,
    ventaLineasRango,
    compraLineasPeriodo,
    resultadoLedger,
    estadoPorInsumo,
    insumos,
    recepcionesVencidas,
    planificacion,
    productosConCosteo,
    ventasHistoricasChart,
  ] = await Promise.all([
    obtenerParametros(),
    prisma.producto.findMany({ select: { id: true, categoria: true, precioVenta: true } }),
    prisma.ventaLinea.findMany({
      where: {
        venta: {
          fecha: {
            gte: new Date(`${inicioAnterior}T00:00:00Z`),
            lt: new Date(`${sumarDiasStr(fin, 1)}T00:00:00Z`),
          },
        },
      },
      select: {
        cantidad: true,
        precioUnitario: true,
        productoId: true,
        venta: { select: { fecha: true } },
      },
    }),
    prisma.compraLinea.findMany({
      where: {
        compra: {
          estado: "recibida",
          fechaRecepcion: {
            gte: new Date(`${inicio}T00:00:00Z`),
            lt: new Date(`${sumarDiasStr(fin, 1)}T00:00:00Z`),
          },
        },
      },
      select: { cantidadRecibidaCompra: true, cantidadCompra: true, precioUnitarioCompra: true },
    }),
    calcularLedgerActual(),
    obtenerEstadoInsumos(),
    prisma.insumo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, stockSeguridad: true, unidadBase: true },
    }),
    prisma.compra.findMany({
      where: { estado: "pendiente", fechaEsperada: { lt: new Date(`${hoy}T00:00:00Z`) } },
      select: { id: true, folio: true, fechaEsperada: true },
    }),
    obtenerPlanificacion(),
    listarProductosConCosteo(),
    prisma.ventaLinea.findMany({
      where: {
        venta: {
          fecha: { gte: new Date(`${sumarDiasStr(hoy, -30)}T00:00:00Z`), lt: new Date(`${hoy}T00:00:00Z`) },
        },
      },
      select: { cantidad: true, precioUnitario: true, venta: { select: { fecha: true } } },
    }),
  ]);

  const categoriaPorProducto = new Map(productos.map((p) => [p.id, p.categoria]));
  const precioNetoPorProducto = new Map(
    productos.map((p) => [
      p.id,
      calcularPrecioVentaNeto(Number(p.precioVenta), parametros.ivaPct, parametros.preciosIncluyenIva),
    ])
  );
  const factorNeto = parametros.preciosIncluyenIva ? 1 / (1 + parametros.ivaPct) : 1;

  // --- Ventas netas (período actual y anterior, para el mix) ---------------
  const ventasBruto = desgloseVacio();
  const ventasBrutoAnterior = desgloseVacio();
  for (const l of ventaLineasRango) {
    const fecha = toFechaCalendario(l.venta.fecha);
    const categoria = categoriaPorProducto.get(l.productoId) ?? "comida";
    const monto = Number(l.cantidad) * Number(l.precioUnitario);
    if (fecha >= inicio && fecha <= fin) acumular(ventasBruto, categoria, monto);
    else if (fecha >= inicioAnterior && fecha <= finAnterior) {
      acumular(ventasBrutoAnterior, categoria, monto);
    }
  }
  const ventasNetas: DesgloseCategoria = {
    comida: ventasBruto.comida * factorNeto,
    bebida: ventasBruto.bebida * factorNeto,
    total: ventasBruto.total * factorNeto,
  };

  // --- Costo de materia prima real (COGS del ledger, §6.3) ------------------
  const costoMateriaPrima = desgloseVacio();
  for (const c of resultadoLedger.cogsPorDiaProducto) {
    if (c.fecha < inicio || c.fecha > fin) continue;
    const categoria = categoriaPorProducto.get(c.productoId) ?? "comida";
    acumular(costoMateriaPrima, categoria, c.cogs);
  }

  const foodCostPct: DesgloseCategoria = {
    comida: ventasNetas.comida > 0 ? costoMateriaPrima.comida / ventasNetas.comida : 0,
    bebida: ventasNetas.bebida > 0 ? costoMateriaPrima.bebida / ventasNetas.bebida : 0,
    total: ventasNetas.total > 0 ? costoMateriaPrima.total / ventasNetas.total : 0,
  };

  const margenBruto: DesgloseCategoria = {
    comida: ventasNetas.comida - costoMateriaPrima.comida,
    bebida: ventasNetas.bebida - costoMateriaPrima.bebida,
    total: ventasNetas.total - costoMateriaPrima.total,
  };

  // --- Mix comida/bebida y su variación vs. período anterior ----------------
  const totalAnterior = ventasBrutoAnterior.total;
  const mix = {
    comidaPct: ventasBruto.total > 0 ? ventasBruto.comida / ventasBruto.total : 0,
    bebidaPct: ventasBruto.total > 0 ? ventasBruto.bebida / ventasBruto.total : 0,
    comidaPctAnterior: totalAnterior > 0 ? ventasBrutoAnterior.comida / totalAnterior : 0,
    bebidaPctAnterior: totalAnterior > 0 ? ventasBrutoAnterior.bebida / totalAnterior : 0,
  };

  // --- Valor de inventario (no depende del período) --------------------------
  let valorInventario = 0;
  for (const estado of estadoPorInsumo.values()) {
    valorInventario += estado.stock * estado.costoMedio;
  }

  // --- Compras del período ----------------------------------------------------
  const comprasPeriodo = compraLineasPeriodo.reduce(
    (acc, l) =>
      acc + Number(l.cantidadRecibidaCompra ?? l.cantidadCompra) * Number(l.precioUnitarioCompra),
    0
  );

  // --- Utilidad estimada -------------------------------------------------------
  const utilidadEstimada = margenBruto.total - parametros.costosFijosDiarios * dias;

  // --- Gráfico: ventas netas reales (30 días) + proyectadas (horizonte) -------
  const ingresoRealPorFecha = new Map<string, number>();
  for (const l of ventasHistoricasChart) {
    const f = toFechaCalendario(l.venta.fecha);
    const monto = Number(l.cantidad) * Number(l.precioUnitario) * factorNeto;
    ingresoRealPorFecha.set(f, (ingresoRealPorFecha.get(f) ?? 0) + monto);
  }

  const montoProyectadoPorFecha = new Map<string, number>();
  for (const fila of planificacion.filasPronostico) {
    const precioNeto = precioNetoPorProducto.get(fila.productoId) ?? 0;
    for (const punto of fila.puntos) {
      montoProyectadoPorFecha.set(
        punto.fecha,
        (montoProyectadoPorFecha.get(punto.fecha) ?? 0) + punto.cantidad * precioNeto
      );
    }
  }

  const serieVentas: PuntoSerieVentas[] = [
    ...Array.from(ingresoRealPorFecha.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, real]) => ({ fecha, real })),
    ...Array.from(montoProyectadoPorFecha.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, proyectado]) => ({ fecha, proyectado })),
  ];

  // --- Alertas accionables, ordenadas por urgencia (§7.2) ----------------------
  const alertas: AlertaDashboard[] = [];

  for (const grupo of planificacion.grupos) {
    for (const linea of grupo.lineas) {
      if (!linea.urgente) continue;
      alertas.push({
        tipo: "quiebre",
        urgente: true,
        mensaje: `${linea.insumoNombre}: quiebre proyectado dentro del lead time`,
        href: "/planificacion",
      });
    }
  }

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  for (const [insumoId, estado] of estadoPorInsumo) {
    const insumo = insumoPorId.get(insumoId);
    if (!insumo) continue;
    if (estado.stock < 0) {
      alertas.push({
        tipo: "stock_negativo",
        urgente: false,
        mensaje: `${insumo.nombre}: stock negativo — revisa compras no registradas`,
        href: "/insumos",
      });
    } else if (estado.stock < Number(insumo.stockSeguridad)) {
      alertas.push({
        tipo: "stock_bajo",
        urgente: false,
        mensaje: `${insumo.nombre}: bajo stock de seguridad`,
        href: "/insumos",
      });
    }
  }

  for (const compra of recepcionesVencidas) {
    alertas.push({
      tipo: "recepcion_vencida",
      urgente: false,
      mensaje: `${compra.folio}: recepción pendiente vencida (esperada ${toFechaCalendario(compra.fechaEsperada)})`,
      href: "/compras",
    });
  }

  for (const producto of productosConCosteo) {
    if (producto.semaforo !== "rojo") continue;
    alertas.push({
      tipo: "food_cost",
      urgente: false,
      mensaje: `${producto.nombre}: food cost sobre el umbral (${(producto.foodCostPct * 100).toFixed(0)}%)`,
      href: "/recetas",
    });
  }

  for (const dia of planificacion.cargaCocina) {
    if (dia.estado === "normal") continue;
    alertas.push({
      tipo: "carga_cocina",
      urgente: dia.estado === "rojo",
      mensaje: `${dia.fecha}: carga de cocina ${dia.estado === "rojo" ? "sobre" : "cerca de"} la capacidad`,
      href: "/planificacion",
    });
  }

  alertas.sort((a, b) => Number(b.urgente) - Number(a.urgente));

  return {
    periodo,
    inicio,
    fin,
    hoy,
    ventasNetas,
    costoMateriaPrima,
    foodCostPct,
    margenBruto,
    valorInventario,
    comprasPeriodo,
    utilidadEstimada,
    mix,
    serieVentas,
    alertas,
  };
}
