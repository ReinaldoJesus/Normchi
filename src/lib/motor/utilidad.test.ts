import { describe, expect, it } from "vitest";
import { calcularUtilidadProyectada } from "./utilidad";

describe("calcularUtilidadProyectada", () => {
  it("calcula margen bruto, utilidad y punto de equilibrio diario", () => {
    const r = calcularUtilidadProyectada({
      productos: [
        {
          productoId: 1,
          margenContribucionUnitario: 4000,
          pronosticoPorDia: [10, 12, 8, 15, 20, 25, 18],
          precioVentaNeto: 6639,
        },
      ],
      horizonteDias: 7,
      costosFijosDiarios: 100000,
    });

    const unidadesTotales = 10 + 12 + 8 + 15 + 20 + 25 + 18;
    expect(r.margenBrutoProyectado).toBeCloseTo(unidadesTotales * 4000, 6);
    expect(r.utilidadProyectada).toBeCloseTo(
      unidadesTotales * 4000 - 100000 * 7,
      6
    );
    expect(r.puntoEquilibrioDiarioUnidades).toBeCloseTo(100000 / 4000, 6);
  });

  it("sin margen ponderado, el punto de equilibrio es infinito (no se puede alcanzar)", () => {
    const r = calcularUtilidadProyectada({
      productos: [],
      horizonteDias: 7,
      costosFijosDiarios: 100000,
    });
    expect(r.puntoEquilibrioDiarioUnidades).toBe(Number.POSITIVE_INFINITY);
  });
});
