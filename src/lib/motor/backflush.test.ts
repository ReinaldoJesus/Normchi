import { describe, expect, it } from "vitest";
import { calcularCogsVenta, calcularConsumoPorVenta } from "./backflush";

describe("calcularConsumoPorVenta", () => {
  it("descuenta cantidad × merma por unidad vendida (criterio #8)", () => {
    const consumos = calcularConsumoPorVenta(10, [
      { productoId: 1, insumoId: 1, cantidad: 150, mermaPct: 0.05 },
    ]);
    expect(consumos).toEqual([{ insumoId: 1, cantidadBase: 1575 }]);
  });

  it("un producto de reventa (receta de 1 línea, cantidad 1, merma 0) descuenta 1:1 (criterio #10e)", () => {
    const consumos = calcularConsumoPorVenta(7, [
      { productoId: 2, insumoId: 9, cantidad: 1, mermaPct: 0 },
    ]);
    expect(consumos).toEqual([{ insumoId: 9, cantidadBase: 7 }]);
  });
});

describe("calcularCogsVenta", () => {
  it("valoriza cada consumo al costo medio vigente del insumo", () => {
    const consumos = calcularConsumoPorVenta(10, [
      { productoId: 1, insumoId: 1, cantidad: 150, mermaPct: 0.05 },
      { productoId: 1, insumoId: 2, cantidad: 20, mermaPct: 0 },
    ]);
    const cogs = calcularCogsVenta(consumos, { 1: 0.72, 2: 3 });
    expect(cogs).toBeCloseTo(1575 * 0.72 + 200 * 3, 6);
  });
});
