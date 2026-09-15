// Especificación §6.9 — Menu engineering y rentabilidad (Kasavana-Smith).

export interface DatosProductoMenu {
  productoId: number;
  unidadesVendidas: number;
  precioPromedioNeto: number;
  costoTeorico: number;
}

export type CuadranteMenu =
  | "estrella"
  | "caballo_de_batalla"
  | "rompecabezas"
  | "perro";

export interface ResultadoMenuProducto {
  productoId: number;
  popularidad: number;
  margenContribucion: number;
  margenTotalAportado: number;
  cuadrante: CuadranteMenu;
}

export function clasificarMenu(
  productos: DatosProductoMenu[]
): ResultadoMenuProducto[] {
  const n = productos.length;
  if (n === 0) return [];

  const totalUnidades = productos.reduce((a, p) => a + p.unidadesVendidas, 0);
  const umbralPopularidad = (1 / n) * 0.7;

  const margenes = productos.map((p) => p.precioPromedioNeto - p.costoTeorico);
  const sumaMargenPonderado = productos.reduce(
    (a, p, i) => a + margenes[i] * p.unidadesVendidas,
    0
  );
  const umbralMargen = totalUnidades > 0 ? sumaMargenPonderado / totalUnidades : 0;

  return productos.map((p, i) => {
    const popularidad = totalUnidades > 0 ? p.unidadesVendidas / totalUnidades : 0;
    const margenContribucion = margenes[i];
    const popularidadAlta = popularidad >= umbralPopularidad;
    const margenAlto = margenContribucion >= umbralMargen;

    let cuadrante: CuadranteMenu;
    if (popularidadAlta && margenAlto) cuadrante = "estrella";
    else if (popularidadAlta && !margenAlto) cuadrante = "caballo_de_batalla";
    else if (!popularidadAlta && margenAlto) cuadrante = "rompecabezas";
    else cuadrante = "perro";

    return {
      productoId: p.productoId,
      popularidad,
      margenContribucion,
      margenTotalAportado: margenContribucion * p.unidadesVendidas,
      cuadrante,
    };
  });
}
