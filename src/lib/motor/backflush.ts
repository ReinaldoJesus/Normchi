// Especificación §6.5 — Consumo por venta (backflush).
import type { RecetaLineaMotor } from "./tipos";

export interface ConsumoInsumo {
  insumoId: number;
  /** Magnitud consumida en unidad base (positiva). */
  cantidadBase: number;
}

/**
 * Explosión de una línea de venta contra la BOM del producto.
 * consumo_base[i] = n × cantidad_receta[i] × (1 + merma_pct[i])
 */
export function calcularConsumoPorVenta(
  unidadesVendidas: number,
  recetaLineas: RecetaLineaMotor[]
): ConsumoInsumo[] {
  return recetaLineas.map((linea) => ({
    insumoId: linea.insumoId,
    cantidadBase: unidadesVendidas * linea.cantidad * (1 + linea.mermaPct),
  }));
}

/**
 * COGS de una línea de venta: suma de cada consumo valorizado al costo medio
 * vigente del insumo en ese momento (no al costo actual).
 */
export function calcularCogsVenta(
  consumos: ConsumoInsumo[],
  costoMedioPorInsumo: Record<number, number>
): number {
  return consumos.reduce(
    (total, c) => total + c.cantidadBase * (costoMedioPorInsumo[c.insumoId] ?? 0),
    0
  );
}
