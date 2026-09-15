import Decimal from "decimal.js";

type Numerico = number | Decimal;

function aNumero(valor: Numerico): number {
  const n = valor instanceof Decimal ? valor.toNumber() : valor;
  // Normaliza -0 a 0: p. ej. stock negativo × costo medio 0 da -0, que
  // Intl.NumberFormat muestra como "-$0" — confuso para un valor que es cero.
  return n === 0 ? 0 : n;
}

const formatoPesos = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const formatoPesosCompacto = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatoCantidad = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatoPorcentaje = new Intl.NumberFormat("es-CL", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatearPesos(valor: Numerico): string {
  return formatoPesos.format(aNumero(valor));
}

/** Formato corto para ejes de gráficos ("$150 k", "$2,5 M"). */
export function formatearPesosCompacto(valor: Numerico): string {
  return formatoPesosCompacto.format(aNumero(valor));
}

export function formatearCantidad(valor: Numerico): string {
  return formatoCantidad.format(aNumero(valor));
}

export function formatearPorcentaje(fraccion: Numerico): string {
  return formatoPorcentaje.format(aNumero(fraccion));
}

/**
 * Presenta un costo por unidad base (ej. $/g) como costo por la magnitud
 * legible correspondiente (ej. $/kg). Un costo por gramo es casi siempre un
 * número menor a $1 y se ve como "$0" o "$1" en CLP (sin decimales) — mostrarlo
 * por kg/L es lo que un dueño de restaurante realmente puede leer.
 */
export function formatearCostoUnitarioLegible(
  costoPorUnidadBase: Numerico,
  unidadBase: "g" | "ml" | "un"
): string {
  if (unidadBase === "un") {
    return `${formatearPesos(costoPorUnidadBase)} /un`;
  }
  const unidadMayor = unidadBase === "g" ? "kg" : "L";
  const costoPorUnidadMayor = aNumero(costoPorUnidadBase) * 1000;
  return `${formatearPesos(costoPorUnidadMayor)} /${unidadMayor}`;
}

/**
 * Presenta una cantidad en unidad base (g o ml) en la magnitud legible
 * correspondiente (kg o L) cuando es ≥ 1000. Ver especificación §6.1.
 * Es solo presentación: el dato subyacente sigue en unidad base.
 */
export function formatearCantidadLegible(
  cantidadBase: Numerico,
  unidadBase: "g" | "ml" | "un"
): string {
  const n = aNumero(cantidadBase);
  if (unidadBase === "un") {
    return `${formatearCantidad(n)} un`;
  }
  const unidadMayor = unidadBase === "g" ? "kg" : "L";
  if (Math.abs(n) >= 1000) {
    return `${formatearCantidad(n / 1000)} ${unidadMayor}`;
  }
  return `${formatearCantidad(n)} ${unidadBase}`;
}
