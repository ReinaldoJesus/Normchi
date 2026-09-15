// Especificación §6.10 — Utilidad proyectada.

export interface PronosticoProductoMargen {
  productoId: number;
  margenContribucionUnitario: number;
  /** Pronóstico diario del producto para cada día del horizonte. */
  pronosticoPorDia: number[];
  /** Precio de venta neto, para expresar el punto de equilibrio en ingresos. */
  precioVentaNeto: number;
}

export interface ResultadoUtilidadProyectada {
  margenBrutoProyectado: number;
  utilidadProyectada: number;
  margenContribucionPromedioPonderado: number;
  puntoEquilibrioDiarioUnidades: number;
  puntoEquilibrioDiarioIngresos: number;
}

export function calcularUtilidadProyectada(params: {
  productos: PronosticoProductoMargen[];
  horizonteDias: number;
  costosFijosDiarios: number;
}): ResultadoUtilidadProyectada {
  const { productos, horizonteDias, costosFijosDiarios } = params;

  let margenBrutoProyectado = 0;
  let unidadesTotales = 0;
  let margenPonderadoAcumulado = 0;
  let precioPonderadoAcumulado = 0;

  for (const p of productos) {
    const unidadesProducto = p.pronosticoPorDia.reduce((a, b) => a + b, 0);
    margenBrutoProyectado += unidadesProducto * p.margenContribucionUnitario;
    unidadesTotales += unidadesProducto;
    margenPonderadoAcumulado += unidadesProducto * p.margenContribucionUnitario;
    precioPonderadoAcumulado += unidadesProducto * p.precioVentaNeto;
  }

  const utilidadProyectada = margenBrutoProyectado - costosFijosDiarios * horizonteDias;

  const margenContribucionPromedioPonderado =
    unidadesTotales > 0 ? margenPonderadoAcumulado / unidadesTotales : 0;
  const precioVentaNetoPromedioPonderado =
    unidadesTotales > 0 ? precioPonderadoAcumulado / unidadesTotales : 0;

  const puntoEquilibrioDiarioUnidades =
    margenContribucionPromedioPonderado > 0
      ? costosFijosDiarios / margenContribucionPromedioPonderado
      : Number.POSITIVE_INFINITY;

  const puntoEquilibrioDiarioIngresos =
    puntoEquilibrioDiarioUnidades === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : puntoEquilibrioDiarioUnidades * precioVentaNetoPromedioPonderado;

  return {
    margenBrutoProyectado,
    utilidadProyectada,
    margenContribucionPromedioPonderado,
    puntoEquilibrioDiarioUnidades,
    puntoEquilibrioDiarioIngresos,
  };
}
