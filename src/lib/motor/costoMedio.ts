// Especificación §6.2 — Valorización de inventario: costo medio móvil ponderado.

export interface EntradaCostoMedio {
  stockPrevio: number;
  costoMedioPrevio: number;
  cantidadEntrada: number;
  costoUnitarioEntrada: number;
}

export interface ResultadoCostoMedio {
  costoMedioNuevo: number;
  stockNuevo: number;
}

/**
 * Aplica una entrada de inventario a costo unitario `c` y recalcula el costo
 * medio ponderado. Si el stock previo es negativo, se descarta (se usa 0) al
 * ponderar, de modo que el costo medio resultante queda directamente en el
 * costo de la entrada, sin promediar contra un stock negativo.
 */
export function aplicarEntradaCostoMedio(
  entrada: EntradaCostoMedio
): ResultadoCostoMedio {
  const { stockPrevio, costoMedioPrevio, cantidadEntrada, costoUnitarioEntrada } =
    entrada;

  const stockPrevioPositivo = Math.max(stockPrevio, 0);
  const stockNuevo = stockPrevio + cantidadEntrada;
  const baseDenominador = stockPrevioPositivo + cantidadEntrada;

  const costoMedioNuevo =
    baseDenominador > 0
      ? (stockPrevioPositivo * costoMedioPrevio +
          cantidadEntrada * costoUnitarioEntrada) /
        baseDenominador
      : costoUnitarioEntrada;

  return { costoMedioNuevo, stockNuevo };
}
