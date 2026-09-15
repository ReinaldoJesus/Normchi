// Especificación §6.4 — Costeo de recetas.
import type { RecetaLineaMotor } from "./tipos";

export interface DesgloseLineaCosto {
  insumoId: number;
  cantidad: number;
  mermaPct: number;
  costoUnitario: number;
  costoTotal: number;
  /** % de participación de este insumo en el costo total del plato. */
  participacionPct: number;
}

export type SemaforoFoodCost = "verde" | "ambar" | "rojo";

export interface CosteoProducto {
  costoTeorico: number;
  precioVentaNeto: number;
  margenUnitario: number;
  margenPct: number;
  foodCostPct: number;
  semaforo: SemaforoFoodCost;
  desglose: DesgloseLineaCosto[];
}

export interface ParametrosCosteo {
  precioVenta: number;
  ivaPct: number;
  preciosIncluyenIva: boolean;
  recetaLineas: RecetaLineaMotor[];
  costoMedioPorInsumo: Record<number, number>;
  /** Umbrales del semáforo de food cost. [SUPUESTO] verde<30%, ámbar 30–38%, rojo>38%. */
  umbralVerde?: number;
  umbralAmbar?: number;
}

export function calcularPrecioVentaNeto(
  precioVenta: number,
  ivaPct: number,
  preciosIncluyenIva: boolean
): number {
  return preciosIncluyenIva ? precioVenta / (1 + ivaPct) : precioVenta;
}

function calcularSemaforo(
  foodCostPct: number,
  umbralVerde: number,
  umbralAmbar: number
): SemaforoFoodCost {
  if (foodCostPct < umbralVerde) return "verde";
  if (foodCostPct <= umbralAmbar) return "ambar";
  return "rojo";
}

export function costearProducto(params: ParametrosCosteo): CosteoProducto {
  const {
    precioVenta,
    ivaPct,
    preciosIncluyenIva,
    recetaLineas,
    costoMedioPorInsumo,
    umbralVerde = 0.3,
    umbralAmbar = 0.38,
  } = params;

  const lineasCosto = recetaLineas.map((linea) => {
    const costoUnitario = costoMedioPorInsumo[linea.insumoId] ?? 0;
    const costoTotal = linea.cantidad * (1 + linea.mermaPct) * costoUnitario;
    return { linea, costoUnitario, costoTotal };
  });

  const costoTeorico = lineasCosto.reduce((acc, l) => acc + l.costoTotal, 0);

  const desglose: DesgloseLineaCosto[] = lineasCosto.map(
    ({ linea, costoUnitario, costoTotal }) => ({
      insumoId: linea.insumoId,
      cantidad: linea.cantidad,
      mermaPct: linea.mermaPct,
      costoUnitario,
      costoTotal,
      participacionPct: costoTeorico > 0 ? costoTotal / costoTeorico : 0,
    })
  );

  const precioVentaNeto = calcularPrecioVentaNeto(
    precioVenta,
    ivaPct,
    preciosIncluyenIva
  );
  const margenUnitario = precioVentaNeto - costoTeorico;
  const margenPct = precioVentaNeto > 0 ? margenUnitario / precioVentaNeto : 0;
  const foodCostPct = precioVentaNeto > 0 ? costoTeorico / precioVentaNeto : 0;

  return {
    costoTeorico,
    precioVentaNeto,
    margenUnitario,
    margenPct,
    foodCostPct,
    semaforo: calcularSemaforo(foodCostPct, umbralVerde, umbralAmbar),
    desglose,
  };
}
