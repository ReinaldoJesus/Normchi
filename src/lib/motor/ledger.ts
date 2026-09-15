// Especificación §6.3 — Ledger de movimientos.
//
// El stock y el costo se derivan procesando todos los eventos en orden
// cronológico. Nunca se actualizan de forma incremental "en caliente".
// Orden dentro de un mismo día: 0 saldo_inicial, 1 entrada_compra,
// 2 ajuste, 3 consumo_venta.
import { aplicarEntradaCostoMedio } from "./costoMedio";
import { calcularConsumoPorVenta } from "./backflush";
import type {
  AjusteEvento,
  CogsDiaProducto,
  CompraLineaEvento,
  MovimientoMotor,
  RecetaLineaMotor,
  VentaLineaEvento,
} from "./tipos";

export interface EstadoInicialInsumo {
  insumoId: number;
  stockInicial: number;
  costoInicial: number;
}

export interface ParametrosLedger {
  /** Fecha (YYYY-MM-DD) que se usa para el movimiento saldo_inicial de cada insumo. */
  fechaApertura: string;
  insumos: EstadoInicialInsumo[];
  /** Solo líneas de compras en estado 'recibida'; fecha = fecha de recepción. */
  compraLineas: CompraLineaEvento[];
  ajustes: AjusteEvento[];
  ventaLineas: VentaLineaEvento[];
  /** Debe incluir la merma del insumo asociado a cada línea. */
  recetaLineas: RecetaLineaMotor[];
}

export interface ResultadoLedger {
  movimientos: MovimientoMotor[];
  stockFinal: Record<number, number>;
  costoMedioFinal: Record<number, number>;
  cogsPorDiaProducto: CogsDiaProducto[];
}

function agruparPorFecha<T extends { fecha: string }>(
  eventos: T[]
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const evento of eventos) {
    const lista = mapa.get(evento.fecha) ?? [];
    lista.push(evento);
    mapa.set(evento.fecha, lista);
  }
  return mapa;
}

export function recalcularLedger(params: ParametrosLedger): ResultadoLedger {
  const { fechaApertura, insumos, compraLineas, ajustes, ventaLineas, recetaLineas } =
    params;

  const recetaPorProducto = new Map<number, RecetaLineaMotor[]>();
  for (const linea of recetaLineas) {
    const lista = recetaPorProducto.get(linea.productoId) ?? [];
    lista.push(linea);
    recetaPorProducto.set(linea.productoId, lista);
  }

  const estado = new Map<
    number,
    { stock: number; costoMedio: number }
  >();
  for (const insumo of insumos) {
    estado.set(insumo.insumoId, {
      stock: insumo.stockInicial,
      costoMedio: insumo.costoInicial,
    });
  }

  const movimientos: MovimientoMotor[] = [];

  for (const insumo of insumos) {
    const { stock, costoMedio } = estado.get(insumo.insumoId)!;
    movimientos.push({
      fecha: fechaApertura,
      secuencia: 0,
      insumoId: insumo.insumoId,
      tipo: "saldo_inicial",
      origenTabla: "saldo_inicial",
      origenId: insumo.insumoId,
      cantidad: insumo.stockInicial,
      costoUnitario: insumo.costoInicial,
      costoMedioResultante: costoMedio,
      stockResultante: stock,
    });
  }

  const entradasPorFecha = agruparPorFecha(compraLineas);
  const ajustesPorFecha = agruparPorFecha(ajustes);
  const ventasPorFecha = agruparPorFecha(ventaLineas);

  const fechas = Array.from(
    new Set([
      ...entradasPorFecha.keys(),
      ...ajustesPorFecha.keys(),
      ...ventasPorFecha.keys(),
    ])
  ).sort();

  const cogsPorDiaProductoMap = new Map<string, number>();

  const obtenerEstado = (insumoId: number) => {
    let e = estado.get(insumoId);
    if (!e) {
      e = { stock: 0, costoMedio: 0 };
      estado.set(insumoId, e);
    }
    return e;
  };

  for (const fecha of fechas) {
    // Secuencia 1: entradas de compra.
    for (const entrada of entradasPorFecha.get(fecha) ?? []) {
      const e = obtenerEstado(entrada.insumoId);
      const { costoMedioNuevo, stockNuevo } = aplicarEntradaCostoMedio({
        stockPrevio: e.stock,
        costoMedioPrevio: e.costoMedio,
        cantidadEntrada: entrada.cantidadBase,
        costoUnitarioEntrada: entrada.costoUnitarioBase,
      });
      e.stock = stockNuevo;
      e.costoMedio = costoMedioNuevo;
      movimientos.push({
        fecha,
        secuencia: 1,
        insumoId: entrada.insumoId,
        tipo: "entrada_compra",
        origenTabla: "compras",
        origenId: entrada.compraId,
        cantidad: entrada.cantidadBase,
        costoUnitario: entrada.costoUnitarioBase,
        costoMedioResultante: e.costoMedio,
        stockResultante: e.stock,
      });
    }

    // Secuencia 2: ajustes de inventario. No modifican el costo medio.
    for (const ajuste of ajustesPorFecha.get(fecha) ?? []) {
      const e = obtenerEstado(ajuste.insumoId);
      e.stock += ajuste.cantidadDelta;
      movimientos.push({
        fecha,
        secuencia: 2,
        insumoId: ajuste.insumoId,
        tipo: "ajuste",
        origenTabla: "ajustes_inventario",
        origenId: ajuste.id,
        cantidad: ajuste.cantidadDelta,
        costoUnitario: 0,
        costoMedioResultante: e.costoMedio,
        stockResultante: e.stock,
      });
    }

    // Secuencia 3: consumo por venta (backflush). El costo medio vigente es
    // el que resulta de aplicar las entradas y ajustes del mismo día.
    const consumoPorVentaInsumo = new Map<string, number>();
    for (const ventaLinea of ventasPorFecha.get(fecha) ?? []) {
      const receta = recetaPorProducto.get(ventaLinea.productoId) ?? [];
      const consumos = calcularConsumoPorVenta(ventaLinea.cantidad, receta);
      for (const consumo of consumos) {
        const clave = `${ventaLinea.ventaId}|${consumo.insumoId}`;
        consumoPorVentaInsumo.set(
          clave,
          (consumoPorVentaInsumo.get(clave) ?? 0) + consumo.cantidadBase
        );

        const costoMedioVigente = obtenerEstado(consumo.insumoId).costoMedio;
        const claveCogs = `${fecha}|${ventaLinea.productoId}`;
        cogsPorDiaProductoMap.set(
          claveCogs,
          (cogsPorDiaProductoMap.get(claveCogs) ?? 0) +
            consumo.cantidadBase * costoMedioVigente
        );
      }
    }

    for (const [clave, cantidadTotal] of consumoPorVentaInsumo) {
      const [ventaIdStr, insumoIdStr] = clave.split("|");
      const ventaId = Number(ventaIdStr);
      const insumoId = Number(insumoIdStr);
      const e = obtenerEstado(insumoId);
      const costoUnitario = e.costoMedio;
      e.stock -= cantidadTotal;
      movimientos.push({
        fecha,
        secuencia: 3,
        insumoId,
        tipo: "consumo_venta",
        origenTabla: "ventas",
        origenId: ventaId,
        cantidad: -cantidadTotal,
        costoUnitario,
        costoMedioResultante: e.costoMedio,
        stockResultante: e.stock,
      });
    }
  }

  const stockFinal: Record<number, number> = {};
  const costoMedioFinal: Record<number, number> = {};
  for (const [insumoId, e] of estado) {
    stockFinal[insumoId] = e.stock;
    costoMedioFinal[insumoId] = e.costoMedio;
  }

  const cogsPorDiaProducto: CogsDiaProducto[] = Array.from(
    cogsPorDiaProductoMap.entries()
  ).map(([clave, cogs]) => {
    const [fecha, productoIdStr] = clave.split("|");
    return { fecha, productoId: Number(productoIdStr), cogs };
  });

  return { movimientos, stockFinal, costoMedioFinal, cogsPorDiaProducto };
}
