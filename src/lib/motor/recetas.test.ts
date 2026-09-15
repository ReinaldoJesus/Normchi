import { describe, expect, it } from "vitest";
import { costearProducto } from "./recetas";

describe("costearProducto", () => {
  it("el costo teórico coincide con la suma de líneas valorizadas con merma (criterio #9)", () => {
    const resultado = costearProducto({
      precioVenta: 7900,
      ivaPct: 0.19,
      preciosIncluyenIva: true,
      recetaLineas: [
        { productoId: 1, insumoId: 1, cantidad: 150, mermaPct: 0.05 },
        { productoId: 1, insumoId: 2, cantidad: 20, mermaPct: 0 },
      ],
      costoMedioPorInsumo: { 1: 0.72, 2: 3 },
    });

    const esperado = 150 * 1.05 * 0.72 + 20 * 1 * 3;
    expect(resultado.costoTeorico).toBeCloseTo(esperado, 6);
    expect(resultado.precioVentaNeto).toBeCloseTo(7900 / 1.19, 6);
    expect(resultado.margenUnitario).toBeCloseTo(
      resultado.precioVentaNeto - esperado,
      6
    );
  });

  it("si un insumo sube de costo, el costo teórico se actualiza (criterio #10)", () => {
    const base = {
      precioVenta: 7900,
      ivaPct: 0.19,
      preciosIncluyenIva: true,
      recetaLineas: [
        { productoId: 1, insumoId: 1, cantidad: 150, mermaPct: 0.05 },
      ],
    };
    const antes = costearProducto({ ...base, costoMedioPorInsumo: { 1: 0.72 } });
    const despues = costearProducto({ ...base, costoMedioPorInsumo: { 1: 1.5 } });
    expect(despues.costoTeorico).toBeGreaterThan(antes.costoTeorico);
    expect(despues.foodCostPct).toBeGreaterThan(antes.foodCostPct);
  });

  it("clasifica el semáforo de food cost", () => {
    const construir = (foodCostPct: number) =>
      costearProducto({
        precioVenta: 1000,
        ivaPct: 0,
        preciosIncluyenIva: false,
        recetaLineas: [{ productoId: 1, insumoId: 1, cantidad: 1, mermaPct: 0 }],
        costoMedioPorInsumo: { 1: foodCostPct * 1000 },
      });

    expect(construir(0.2).semaforo).toBe("verde");
    expect(construir(0.35).semaforo).toBe("ambar");
    expect(construir(0.5).semaforo).toBe("rojo");
  });

  it("un producto de reventa (1 línea, cantidad 1, merma 0) margina precio_neto − costo_medio (criterio #10e)", () => {
    const resultado = costearProducto({
      precioVenta: 1800,
      ivaPct: 0.19,
      preciosIncluyenIva: true,
      recetaLineas: [{ productoId: 2, insumoId: 9, cantidad: 1, mermaPct: 0 }],
      costoMedioPorInsumo: { 9: 900 },
    });
    expect(resultado.margenUnitario).toBeCloseTo(1800 / 1.19 - 900, 6);
  });
});
