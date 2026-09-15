import { describe, expect, it } from "vitest";
import {
  ajustarModelo,
  calcularNivelConfianza,
  construirSerie,
  pronosticarDia,
  type DiaHistorico,
} from "./pronostico";

function generarDias(
  totalDias: number,
  valorPorDow: (dow: number) => number,
  opts: { fechaInicioISO?: string; ruido?: (dow: number, i: number) => number } = {}
): DiaHistorico[] {
  const inicio = new Date(opts.fechaInicioISO ?? "2026-01-05T00:00:00Z"); // lunes
  const dias: DiaHistorico[] = [];
  for (let i = 0; i < totalDias; i++) {
    const fechaDate = new Date(inicio);
    fechaDate.setUTCDate(inicio.getUTCDate() + i);
    const dow = fechaDate.getUTCDay();
    const ruido = opts.ruido?.(dow, i) ?? 0;
    dias.push({
      fecha: fechaDate.toISOString().slice(0, 10),
      dow,
      operativo: true,
      registrado: true,
      cantidadVendida: Math.max(0, valorPorDow(dow) + ruido),
    });
  }
  return dias;
}

describe("construirSerie", () => {
  it("clasifica día operado sin venta como u_t = 0 (no como brecha)", () => {
    const dias: DiaHistorico[] = [
      { fecha: "2026-01-05", dow: 1, operativo: true, registrado: true, cantidadVendida: 0 },
    ];
    const serie = construirSerie(dias);
    expect(serie.observaciones).toEqual([{ fecha: "2026-01-05", dow: 1, u: 0 }]);
    expect(serie.diasBrecha).toBe(0);
  });

  it("excluye un día no operado y no lo cuenta como brecha (criterio #10c)", () => {
    const dias: DiaHistorico[] = [
      { fecha: "2026-01-05", dow: 1, operativo: false, registrado: false },
    ];
    const serie = construirSerie(dias);
    expect(serie.observaciones).toHaveLength(0);
    expect(serie.diasOperativos).toBe(0);
    expect(serie.diasBrecha).toBe(0);
  });

  it("excluye un día operado sin registrar y lo cuenta como brecha (criterio #10d)", () => {
    const dias: DiaHistorico[] = [
      { fecha: "2026-01-05", dow: 1, operativo: true, registrado: false },
    ];
    const serie = construirSerie(dias);
    expect(serie.observaciones).toHaveLength(0);
    expect(serie.diasBrecha).toBe(1);
    expect(serie.coberturaRegistro).toBe(0);
  });
});

describe("ajustarModelo + pronosticarDia", () => {
  it("con serie perfectamente periódica, el pronóstico del próximo lunes reproduce el valor con error < 5% (criterio #11)", () => {
    // Relación lunes/otros días de 2:1, dentro del clamp [0.25, 2.50] de §6.6 paso 3:
    // así el índice de estacionalidad captura la relación real sin distorsión.
    const dias = generarDias(56, (dow) => (dow === 1 ? 20 : 10));
    const serie = construirSerie(dias);
    const modelo = ajustarModelo(serie.observaciones);
    expect(modelo).not.toBeNull();
    const pronosticoLunes = pronosticarDia(modelo!, 1);
    expect(Math.abs(pronosticoLunes - 20) / 20).toBeLessThan(0.05);
  });

  it("con serie constante, todos los índices quedan en 1,00 y el pronóstico es igual a la constante (criterio #12)", () => {
    const dias = generarDias(56, () => 20);
    const serie = construirSerie(dias);
    const modelo = ajustarModelo(serie.observaciones);
    expect(modelo).not.toBeNull();
    for (let d = 0; d < 7; d++) {
      expect(modelo!.indices[d]).toBeCloseTo(1, 6);
    }
    for (let d = 0; d < 7; d++) {
      expect(pronosticarDia(modelo!, d)).toBeCloseTo(20, 6);
    }
  });

  it("el promedio de los 7 índices de estacionalidad es siempre 1,00 (criterio #15)", () => {
    const dias = generarDias(56, (dow) => 15 + dow * 3, {
      ruido: (_dow, i) => (i % 3 === 0 ? 2 : -1),
    });
    const serie = construirSerie(dias);
    const modelo = ajustarModelo(serie.observaciones);
    const promedioIndices =
      Object.values(modelo!.indices).reduce((a, b) => a + b, 0) / 7;
    expect(promedioIndices).toBeCloseTo(1, 6);
  });
});

describe("calcularNivelConfianza", () => {
  it("con menos de 21 días de datos, la confianza es baja (criterio #13)", () => {
    expect(
      calcularNivelConfianza({ diasConDatos: 15, coberturaRegistro: 1 })
    ).toBe("baja");
  });

  it("degrada a baja si la cobertura de registro cae bajo 70%, sin importar el WAPE", () => {
    expect(
      calcularNivelConfianza({ diasConDatos: 50, coberturaRegistro: 0.5, wape: 0.05 })
    ).toBe("baja");
  });

  it("es alta con ≥42 días y WAPE < 25%", () => {
    expect(
      calcularNivelConfianza({ diasConDatos: 45, coberturaRegistro: 0.9, wape: 0.2 })
    ).toBe("alta");
  });
});
