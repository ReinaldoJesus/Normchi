// Especificación §6.6 — Pronóstico de demanda.
// Nivel con suavizamiento exponencial simple + índice de estacionalidad semanal
// (Holt-Winters aditivo simplificado, sin tendencia).

export interface DiaHistorico {
  fecha: string;
  /** 0 = domingo .. 6 = sábado. */
  dow: number;
  /** false si el día cae fuera de días de operación o está marcado como cierre. */
  operativo: boolean;
  /** existe al menos un registro de venta ese día (de cualquier producto). */
  registrado: boolean;
  /** unidades vendidas del producto ese día, si `registrado` es true. */
  cantidadVendida?: number;
}

export interface ObservacionSerie {
  fecha: string;
  dow: number;
  u: number;
}

export interface SerieProcesada {
  observaciones: ObservacionSerie[];
  diasOperativos: number;
  diasRegistrados: number;
  diasBrecha: number;
  /** días registrados / días operativos, entre los días operativos del período. */
  coberturaRegistro: number;
}

/**
 * Paso 1 — Construye la serie diaria distinguiendo día operado+registrado
 * sin venta (u_t = 0, válido), día no operado (excluido, no es brecha) y día
 * operado sin registrar (excluido y contado como brecha de cobertura).
 */
export function construirSerie(dias: DiaHistorico[]): SerieProcesada {
  const operativos = dias.filter((d) => d.operativo);
  const registrados = operativos.filter((d) => d.registrado);
  const brechas = operativos.filter((d) => !d.registrado);

  const observaciones: ObservacionSerie[] = registrados.map((d) => ({
    fecha: d.fecha,
    dow: d.dow,
    u: d.cantidadVendida ?? 0,
  }));

  return {
    observaciones,
    diasOperativos: operativos.length,
    diasRegistrados: registrados.length,
    diasBrecha: brechas.length,
    coberturaRegistro:
      operativos.length > 0 ? registrados.length / operativos.length : 0,
  };
}

export type IndicesEstacionalidad = Record<number, number>;

export interface ModeloNivel {
  mu: number;
  indices: IndicesEstacionalidad;
  nivelFinal: number;
  diasConDatos: number;
}

function calcularIndicesEstacionalidad(
  observaciones: ObservacionSerie[],
  mu: number
): IndicesEstacionalidad {
  const sumaPorDow = new Map<number, number>();
  const nPorDow = new Map<number, number>();
  for (const obs of observaciones) {
    sumaPorDow.set(obs.dow, (sumaPorDow.get(obs.dow) ?? 0) + obs.u);
    nPorDow.set(obs.dow, (nPorDow.get(obs.dow) ?? 0) + 1);
  }

  const iSuave: IndicesEstacionalidad = {};
  for (let d = 0; d < 7; d++) {
    const n = nPorDow.get(d) ?? 0;
    const promedio = n > 0 ? (sumaPorDow.get(d) ?? 0) / n : mu;
    const iCrudo = mu > 0 ? promedio / mu : 1;
    const iAcotado = Math.min(2.5, Math.max(0.25, iCrudo));
    const w = Math.min(1, n / 4);
    iSuave[d] = w * iAcotado + (1 - w) * 1;
  }

  const sumaSuave = Object.values(iSuave).reduce((a, b) => a + b, 0);
  const indices: IndicesEstacionalidad = {};
  for (let d = 0; d < 7; d++) {
    indices[d] = sumaSuave > 0 ? (iSuave[d] * 7) / sumaSuave : 1;
  }
  return indices;
}

/**
 * Pasos 2 a 4. Devuelve `null` si μ ≤ 0 (sin datos de venta) — el pronóstico
 * debe ser 0 para todo el horizonte con confianza "sin_datos".
 */
export function ajustarModelo(
  observaciones: ObservacionSerie[],
  alpha = 0.3
): ModeloNivel | null {
  if (observaciones.length === 0) return null;

  const mu = observaciones.reduce((a, o) => a + o.u, 0) / observaciones.length;
  if (mu <= 0) return null;

  const indices = calcularIndicesEstacionalidad(observaciones, mu);

  let nivel = mu;
  for (const obs of observaciones) {
    const indiceDelDia = indices[obs.dow] ?? 1;
    nivel = alpha * (obs.u / indiceDelDia) + (1 - alpha) * nivel;
  }

  return { mu, indices, nivelFinal: nivel, diasConDatos: observaciones.length };
}

/** Paso 5 — F(fecha) = max(0, L_H × I_dow(fecha)). */
export function pronosticarDia(modelo: ModeloNivel, dow: number): number {
  return Math.max(0, modelo.nivelFinal * (modelo.indices[dow] ?? 1));
}

export type NivelConfianza = "alta" | "media" | "baja" | "sin_datos";

export function calcularNivelConfianza(params: {
  diasConDatos: number;
  coberturaRegistro: number;
  wape?: number;
}): NivelConfianza {
  const { diasConDatos, coberturaRegistro, wape } = params;
  if (diasConDatos === 0) return "sin_datos";
  if (diasConDatos < 21 || coberturaRegistro < 0.7) return "baja";
  if (diasConDatos >= 42 && wape !== undefined && wape < 0.25) return "alta";
  return "media";
}

/** WAPE = Σ|real − pronosticado| / Σ real. */
export function calcularWape(
  pares: { real: number; pronosticado: number }[]
): number {
  const sumaReal = pares.reduce((a, p) => a + p.real, 0);
  if (sumaReal === 0) return 0;
  const sumaError = pares.reduce(
    (a, p) => a + Math.abs(p.real - p.pronosticado),
    0
  );
  return sumaError / sumaReal;
}

export interface ResultadoBacktest {
  wape: number;
  modeloEntrenado: ModeloNivel;
}

/**
 * Reserva los últimos `horizonteHoldout` días como holdout, ajusta el modelo
 * con el resto y calcula el WAPE contra los días del holdout con datos reales.
 */
export function backtestear(
  dias: DiaHistorico[],
  horizonteHoldout = 14,
  alpha = 0.3
): ResultadoBacktest | null {
  const ordenados = [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const entrenamiento = ordenados.slice(
    0,
    Math.max(0, ordenados.length - horizonteHoldout)
  );
  const holdout = ordenados.slice(Math.max(0, ordenados.length - horizonteHoldout));

  const serie = construirSerie(entrenamiento);
  const modelo = ajustarModelo(serie.observaciones, alpha);
  if (!modelo) return null;

  const pares = holdout
    .filter((d) => d.operativo && d.registrado)
    .map((d) => ({
      real: d.cantidadVendida ?? 0,
      pronosticado: pronosticarDia(modelo, d.dow),
    }));

  return { wape: calcularWape(pares), modeloEntrenado: modelo };
}

export interface ForecastOverride {
  fecha: string;
  cantidad: number;
  motivo?: string;
}

export interface PuntoPronostico {
  fecha: string;
  cantidad: number;
  esOverride: boolean;
}

/** Un override manual tiene precedencia absoluta sobre el modelo (criterio #14). */
export function aplicarOverrides(
  pronosticos: { fecha: string; cantidad: number }[],
  overrides: ForecastOverride[]
): PuntoPronostico[] {
  const overridePorFecha = new Map(overrides.map((o) => [o.fecha, o]));
  return pronosticos.map((p) => {
    const override = overridePorFecha.get(p.fecha);
    return override
      ? { fecha: p.fecha, cantidad: override.cantidad, esOverride: true }
      : { fecha: p.fecha, cantidad: p.cantidad, esOverride: false };
  });
}
