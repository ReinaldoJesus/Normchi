import { describe, expect, it } from "vitest";
import { recalcularLedger, type ParametrosLedger } from "./ledger";

function base(overrides: Partial<ParametrosLedger> = {}): ParametrosLedger {
  return {
    fechaApertura: "2026-01-01",
    insumos: [{ insumoId: 1, stockInicial: 0, costoInicial: 0 }],
    compraLineas: [],
    ajustes: [],
    ventaLineas: [],
    recetaLineas: [],
    ...overrides,
  };
}

describe("recalcularLedger", () => {
  it("una compra recibida incrementa el stock y fija el costo medio", () => {
    const r = recalcularLedger(
      base({
        compraLineas: [
          {
            id: 1,
            compraId: 100,
            insumoId: 1,
            fecha: "2026-01-05",
            cantidadBase: 10000,
            costoUnitarioBase: 5,
          },
        ],
      })
    );
    expect(r.stockFinal[1]).toBe(10000);
    expect(r.costoMedioFinal[1]).toBe(5);
  });

  it("un ajuste cambia el stock y no cambia el costo medio (criterio #7)", () => {
    const r = recalcularLedger(
      base({
        insumos: [{ insumoId: 1, stockInicial: 1000, costoInicial: 5 }],
        ajustes: [{ id: 1, insumoId: 1, fecha: "2026-01-02", cantidadDelta: -200 }],
      })
    );
    expect(r.stockFinal[1]).toBe(800);
    expect(r.costoMedioFinal[1]).toBe(5);
  });

  it("vender 10 unidades con receta de 150 g y 5% de merma descuenta 1.575 g (criterio #8)", () => {
    const r = recalcularLedger(
      base({
        insumos: [{ insumoId: 1, stockInicial: 10000, costoInicial: 1 }],
        ventaLineas: [
          { id: 1, ventaId: 500, fecha: "2026-01-10", productoId: 1, cantidad: 10 },
        ],
        recetaLineas: [
          { productoId: 1, insumoId: 1, cantidad: 150, mermaPct: 0.05 },
        ],
      })
    );
    expect(r.stockFinal[1]).toBe(10000 - 1575);
    expect(r.cogsPorDiaProducto).toEqual([
      { fecha: "2026-01-10", productoId: 1, cogs: 1575 },
    ]);
  });

  it("las compras del día están disponibles para el consumo del mismo día", () => {
    const r = recalcularLedger(
      base({
        insumos: [{ insumoId: 1, stockInicial: 0, costoInicial: 0 }],
        compraLineas: [
          {
            id: 1,
            compraId: 1,
            insumoId: 1,
            fecha: "2026-01-05",
            cantidadBase: 1000,
            costoUnitarioBase: 4,
          },
        ],
        ventaLineas: [
          { id: 1, ventaId: 1, fecha: "2026-01-05", productoId: 1, cantidad: 2 },
        ],
        recetaLineas: [{ productoId: 1, insumoId: 1, cantidad: 100, mermaPct: 0 }],
      })
    );
    // 1000 entra, 200 se consume el mismo día → 800.
    expect(r.stockFinal[1]).toBe(800);
    // El consumo se valoriza al costo medio vigente tras la compra del mismo día ($4).
    expect(r.cogsPorDiaProducto[0].cogs).toBe(800);
  });

  it("borrar una compra intermedia y recalcular da el mismo resultado que si nunca hubiera existido (criterio #6)", () => {
    const conTresCompras = recalcularLedger(
      base({
        compraLineas: [
          { id: 1, compraId: 1, insumoId: 1, fecha: "2026-01-01", cantidadBase: 1000, costoUnitarioBase: 5 },
          { id: 2, compraId: 2, insumoId: 1, fecha: "2026-01-02", cantidadBase: 500, costoUnitarioBase: 8 },
          { id: 3, compraId: 3, insumoId: 1, fecha: "2026-01-03", cantidadBase: 300, costoUnitarioBase: 6 },
        ],
      })
    );
    const sinLaSegunda = recalcularLedger(
      base({
        compraLineas: [
          { id: 1, compraId: 1, insumoId: 1, fecha: "2026-01-01", cantidadBase: 1000, costoUnitarioBase: 5 },
          { id: 3, compraId: 3, insumoId: 1, fecha: "2026-01-03", cantidadBase: 300, costoUnitarioBase: 6 },
        ],
      })
    );
    const comoSiNuncaHubieseExistido = recalcularLedger(
      base({
        compraLineas: [
          { id: 1, compraId: 1, insumoId: 1, fecha: "2026-01-01", cantidadBase: 1000, costoUnitarioBase: 5 },
          { id: 3, compraId: 3, insumoId: 1, fecha: "2026-01-03", cantidadBase: 300, costoUnitarioBase: 6 },
        ],
      })
    );

    expect(sinLaSegunda.stockFinal).toEqual(comoSiNuncaHubieseExistido.stockFinal);
    expect(sinLaSegunda.costoMedioFinal).toEqual(
      comoSiNuncaHubieseExistido.costoMedioFinal
    );
    expect(sinLaSegunda.costoMedioFinal[1]).not.toBe(
      conTresCompras.costoMedioFinal[1]
    );
  });
});
