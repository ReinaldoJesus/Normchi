import { describe, expect, it } from "vitest";
import { calcularSugerenciaCompra, type ParametrosMrpInsumo } from "./mrp";

function requerimientosConstantes(dias: number, valor: number, inicioISO = "2026-02-01") {
  const inicio = new Date(`${inicioISO}T00:00:00Z`);
  return Array.from({ length: dias }, (_, i) => {
    const f = new Date(inicio);
    f.setUTCDate(inicio.getUTCDate() + i);
    return { fecha: f.toISOString().slice(0, 10), requerimiento: valor };
  });
}

function base(overrides: Partial<ParametrosMrpInsumo> = {}): ParametrosMrpInsumo {
  return {
    insumoId: 1,
    stockActual: 0,
    stockSeguridad: 0,
    leadTimeDias: 3,
    loteMinimoCompra: 1,
    factorConversion: 1000,
    costoMedio: 5,
    requerimientos: requerimientosConstantes(5, 10),
    entradasProgramadas: [],
    hoy: "2026-01-01",
    ...overrides,
  };
}

describe("calcularSugerenciaCompra", () => {
  it("insumo con stock 0, sin compras pendientes y requerimiento positivo siempre sugiere compra (criterio #16)", () => {
    const r = calcularSugerenciaCompra(base());
    expect(r.cubierto).toBe(false);
    expect(r.fechaQuiebre).not.toBeNull();
    expect(r.cantidadFinal).toBeGreaterThan(0);
  });

  it("una compra pendiente que llega antes del quiebre no genera sugerencia (criterio #17)", () => {
    const r = calcularSugerenciaCompra(
      base({
        entradasProgramadas: [{ fecha: "2026-02-01", cantidadBase: 100 }],
      })
    );
    expect(r.cubierto).toBe(true);
    expect(r.fechaQuiebre).toBeNull();
    expect(r.cantidadFinal).toBe(0);
  });

  it("la fecha sugerida de pedido es exactamente la fecha de quiebre menos el lead time (criterio #18)", () => {
    const r = calcularSugerenciaCompra(base({ leadTimeDias: 3 }));
    expect(r.fechaQuiebre).toBe("2026-02-01");
    expect(r.fechaPedido).toBe("2026-01-29");
  });

  it("marca la sugerencia como urgente si la fecha de pedido ya pasó", () => {
    const r = calcularSugerenciaCompra(base({ leadTimeDias: 3, hoy: "2026-02-01" }));
    expect(r.urgente).toBe(true);
  });

  it("la cantidad sugerida nunca es menor al lote mínimo ni fraccionaria en unidad de compra (criterio #19)", () => {
    const r = calcularSugerenciaCompra(
      base({
        stockActual: 4995,
        requerimientos: requerimientosConstantes(1, 5),
        loteMinimoCompra: 2,
        factorConversion: 1000,
      })
    );
    // necesidad_neta = 5 - 4995 + 0 = ... calculemos: requerimiento total=5, stockSeguridad=0,
    // stockActual=4995 → necesidadNeta = 5 + 0 - 4995 - 0 = negativo → sin sugerencia.
    expect(r.cantidadFinal).toBe(0);

    const r2 = calcularSugerenciaCompra(
      base({
        stockActual: 0,
        requerimientos: requerimientosConstantes(1, 1500),
        loteMinimoCompra: 2,
        factorConversion: 1000,
      })
    );
    // necesidadNeta = 1500 → ceil(1500/1000) = 2 unidades de compra, ya ≥ lote mínimo.
    expect(r2.cantidadEnUnidadCompra).toBe(2);
    expect(r2.cantidadFinal).toBe(2);
    expect(Number.isInteger(r2.cantidadFinal)).toBe(true);

    const r3 = calcularSugerenciaCompra(
      base({
        stockActual: 0,
        requerimientos: requerimientosConstantes(1, 50),
        loteMinimoCompra: 5,
        factorConversion: 1000,
      })
    );
    // necesidadNeta = 50 → ceil(50/1000) = 1, pero el lote mínimo es 5.
    expect(r3.cantidadFinal).toBe(5);
  });
});
