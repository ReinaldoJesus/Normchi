import { describe, expect, it } from "vitest";
import { aplicarEntradaCostoMedio } from "./costoMedio";

describe("aplicarEntradaCostoMedio", () => {
  it("con stock 0, comprar a costo c deja el costo medio en c (criterio #2)", () => {
    const r = aplicarEntradaCostoMedio({
      stockPrevio: 0,
      costoMedioPrevio: 0,
      cantidadEntrada: 1000,
      costoUnitarioEntrada: 5,
    });
    expect(r.costoMedioNuevo).toBe(5);
    expect(r.stockNuevo).toBe(1000);
  });

  it("promedia ponderado con stock y costo previos (criterio #3)", () => {
    const r = aplicarEntradaCostoMedio({
      stockPrevio: 1000,
      costoMedioPrevio: 5,
      cantidadEntrada: 1000,
      costoUnitarioEntrada: 7,
    });
    expect(r.costoMedioNuevo).toBe(6);
    expect(r.stockNuevo).toBe(2000);
  });

  it("promedia ponderado con cantidades distintas (criterio #4)", () => {
    const r = aplicarEntradaCostoMedio({
      stockPrevio: 1000,
      costoMedioPrevio: 5,
      cantidadEntrada: 3000,
      costoUnitarioEntrada: 9,
    });
    expect(r.costoMedioNuevo).toBe(8);
    expect(r.stockNuevo).toBe(4000);
  });

  it("con stock negativo, el costo medio se toma directo de la compra (criterio #5)", () => {
    const r = aplicarEntradaCostoMedio({
      stockPrevio: -500,
      costoMedioPrevio: 999, // no debe influir en el resultado
      cantidadEntrada: 1000,
      costoUnitarioEntrada: 4,
    });
    expect(r.costoMedioNuevo).toBe(4);
    expect(r.stockNuevo).toBe(500);
  });
});
