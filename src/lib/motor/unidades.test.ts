import { describe, expect, it } from "vitest";
import { cantidadBaseDesdeCompra, costoPorUnidadBase } from "./unidades";

describe("unidades", () => {
  it("convierte sacos de harina a gramos", () => {
    // 3 sacos de 25 kg a $18.000 el saco.
    const factor = 25000; // 1 saco = 25.000 g
    expect(cantidadBaseDesdeCompra(3, factor)).toBe(75000);
    expect(costoPorUnidadBase(18000, factor)).toBeCloseTo(0.72, 6);
  });

  it("compra de 10 kg con factor 1000 incrementa el stock en 10.000 g (criterio #1)", () => {
    expect(cantidadBaseDesdeCompra(10, 1000)).toBe(10000);
  });
});
