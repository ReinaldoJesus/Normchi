import { describe, expect, it } from "vitest";
import { toFechaCalendario, toFechaLocal } from "./fechas";

describe("toFechaLocal", () => {
  it("una venta el 31 de enero a las 23:00 hora de Santiago se guarda como 2026-01-31 (criterio #21)", () => {
    // 2026-01-31 23:00 America/Santiago (UTC-3 en horario de verano) = 2026-02-01T02:00:00Z.
    const instante = new Date("2026-02-01T02:00:00Z");
    expect(toFechaLocal(instante)).toBe("2026-01-31");
  });

  it("no coincide con Date.toISOString(), que sí desfasa un día", () => {
    const instante = new Date("2026-02-01T02:00:00Z");
    expect(instante.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(toFechaLocal(instante)).toBe("2026-01-31");
  });
});

describe("toFechaCalendario", () => {
  it("extrae el día calendario sin convertir por zona horaria", () => {
    // Columnas @db.Date (fecha_emision, ventas.fecha, etc.) se escriben como
    // new Date("YYYY-MM-DD"), que ancla a medianoche UTC. toFechaLocal
    // aplicado aquí las desfasaría un día en un huso negativo; toFechaCalendario no.
    const fecha = new Date("2026-09-09");
    expect(toFechaCalendario(fecha)).toBe("2026-09-09");
    expect(toFechaLocal(fecha)).toBe("2026-09-08");
  });
});
