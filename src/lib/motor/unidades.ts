// Especificación §6.1 — Unidades y conversión.

/** cantidad_base = cantidad_compra × factor_conversion */
export function cantidadBaseDesdeCompra(
  cantidadCompra: number,
  factorConversion: number
): number {
  return cantidadCompra * factorConversion;
}

/** costo_por_unidad_base = precio_unitario_compra / factor_conversion */
export function costoPorUnidadBase(
  precioUnitarioCompra: number,
  factorConversion: number
): number {
  return precioUnitarioCompra / factorConversion;
}
