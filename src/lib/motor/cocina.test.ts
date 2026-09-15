import { describe, expect, it } from "vitest";
import { calcularCargaCocina } from "./cocina";

describe("calcularCargaCocina", () => {
  it("suma la carga en minutos por día y marca el estado según la capacidad", () => {
    const resultado = calcularCargaCocina(
      [
        { fecha: "2026-02-01", productoId: 1, cantidadPronosticada: 20, tiempoPreparacionMin: 8 },
        { fecha: "2026-02-01", productoId: 2, cantidadPronosticada: 10, tiempoPreparacionMin: 5 },
      ],
      300
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cargaMinutos).toBe(20 * 8 + 10 * 5);
    expect(resultado[0].utilizacion).toBeCloseTo((20 * 8 + 10 * 5) / 300, 6);
  });

  it("marca en rojo un día con utilización > 100% y en ámbar > 85%", () => {
    const [rojo] = calcularCargaCocina(
      [{ fecha: "2026-02-01", productoId: 1, cantidadPronosticada: 100, tiempoPreparacionMin: 10 }],
      480
    );
    expect(rojo.estado).toBe("rojo");

    const [ambar] = calcularCargaCocina(
      [{ fecha: "2026-02-01", productoId: 1, cantidadPronosticada: 44, tiempoPreparacionMin: 10 }],
      480
    );
    expect(ambar.estado).toBe("ambar");
  });

  it("desagrega la carga por estación cuando el campo está poblado", () => {
    const [dia] = calcularCargaCocina(
      [
        { fecha: "2026-02-01", productoId: 1, cantidadPronosticada: 10, tiempoPreparacionMin: 5, estacion: "Freidora" },
        { fecha: "2026-02-01", productoId: 2, cantidadPronosticada: 10, tiempoPreparacionMin: 3, estacion: "Parrilla" },
      ],
      480
    );
    expect(dia.porEstacion).toEqual({ Freidora: 50, Parrilla: 30 });
  });
});
