import { describe, expect, it } from "vitest";
import { clasificarMenu } from "./menuEngineering";

describe("clasificarMenu", () => {
  it("clasifica los 4 cuadrantes de Kasavana-Smith", () => {
    const resultado = clasificarMenu([
      { productoId: 1, unidadesVendidas: 100, precioPromedioNeto: 5000, costoTeorico: 1500 }, // alta pop, alto margen
      { productoId: 2, unidadesVendidas: 90, precioPromedioNeto: 5000, costoTeorico: 4000 }, // alta pop, bajo margen
      { productoId: 3, unidadesVendidas: 5, precioPromedioNeto: 8000, costoTeorico: 1500 }, // baja pop, alto margen
      { productoId: 4, unidadesVendidas: 5, precioPromedioNeto: 3000, costoTeorico: 2800 }, // baja pop, bajo margen
    ]);

    const porId = new Map(resultado.map((r) => [r.productoId, r]));
    expect(porId.get(1)!.cuadrante).toBe("estrella");
    expect(porId.get(2)!.cuadrante).toBe("caballo_de_batalla");
    expect(porId.get(3)!.cuadrante).toBe("rompecabezas");
    expect(porId.get(4)!.cuadrante).toBe("perro");
  });

  it("la popularidad de todos los productos suma 1", () => {
    const resultado = clasificarMenu([
      { productoId: 1, unidadesVendidas: 30, precioPromedioNeto: 5000, costoTeorico: 2000 },
      { productoId: 2, unidadesVendidas: 70, precioPromedioNeto: 4000, costoTeorico: 1000 },
    ]);
    const sumaPopularidad = resultado.reduce((a, r) => a + r.popularidad, 0);
    expect(sumaPopularidad).toBeCloseTo(1, 6);
  });
});
