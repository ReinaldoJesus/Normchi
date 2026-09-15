import "server-only";
import { prisma } from "@/lib/prisma";

export interface ParametrosApp {
  moneda: string;
  ivaPct: number;
  preciosIncluyenIva: boolean;
  horizontePlanificacionDias: number;
  ventanaHistorialDias: number;
  alphaSuavizamiento: number;
  capacidadMinutosDia: number;
  costosFijosDiarios: number;
  diasOperacionSemana: number[];
}

export const PARAMETROS_DEFECTO: ParametrosApp = {
  moneda: "CLP",
  ivaPct: 0.19,
  preciosIncluyenIva: true,
  horizontePlanificacionDias: 14,
  ventanaHistorialDias: 56,
  alphaSuavizamiento: 0.3,
  capacidadMinutosDia: 480,
  costosFijosDiarios: 0,
  diasOperacionSemana: [1, 2, 3, 4, 5, 6],
};

// Ver especificación §5.2 — tabla `parametros`, clave-valor tipada.
const CLAVES: Record<keyof ParametrosApp, string> = {
  moneda: "moneda",
  ivaPct: "iva_pct",
  preciosIncluyenIva: "precios_incluyen_iva",
  horizontePlanificacionDias: "horizonte_planificacion_dias",
  ventanaHistorialDias: "ventana_historial_dias",
  alphaSuavizamiento: "alpha_suavizamiento",
  capacidadMinutosDia: "capacidad_minutos_dia",
  costosFijosDiarios: "costos_fijos_diarios",
  diasOperacionSemana: "dias_operacion_semana",
};

function serializar(valor: string | number | boolean | number[]): string {
  if (typeof valor === "boolean") return valor ? "true" : "false";
  if (Array.isArray(valor)) return JSON.stringify(valor);
  return String(valor);
}

function comoNumero(valor: string | undefined, porDefecto: number): number {
  if (valor === undefined) return porDefecto;
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function comoBooleano(valor: string | undefined, porDefecto: boolean): boolean {
  return valor === undefined ? porDefecto : valor === "true";
}

function comoArrayNumeros(valor: string | undefined, porDefecto: number[]): number[] {
  if (valor === undefined) return porDefecto;
  try {
    const parsed = JSON.parse(valor);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "number")) return parsed;
  } catch {
    return porDefecto;
  }
  return porDefecto;
}

/** Lee la tabla `parametros`, completando con los valores por defecto (§3, §5.2) los que aún no se han configurado. */
export async function obtenerParametros(): Promise<ParametrosApp> {
  const filas = await prisma.parametro.findMany();
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));

  return {
    moneda: mapa.get(CLAVES.moneda) ?? PARAMETROS_DEFECTO.moneda,
    ivaPct: comoNumero(mapa.get(CLAVES.ivaPct), PARAMETROS_DEFECTO.ivaPct),
    preciosIncluyenIva: comoBooleano(
      mapa.get(CLAVES.preciosIncluyenIva),
      PARAMETROS_DEFECTO.preciosIncluyenIva
    ),
    horizontePlanificacionDias: comoNumero(
      mapa.get(CLAVES.horizontePlanificacionDias),
      PARAMETROS_DEFECTO.horizontePlanificacionDias
    ),
    ventanaHistorialDias: comoNumero(
      mapa.get(CLAVES.ventanaHistorialDias),
      PARAMETROS_DEFECTO.ventanaHistorialDias
    ),
    alphaSuavizamiento: comoNumero(
      mapa.get(CLAVES.alphaSuavizamiento),
      PARAMETROS_DEFECTO.alphaSuavizamiento
    ),
    capacidadMinutosDia: comoNumero(
      mapa.get(CLAVES.capacidadMinutosDia),
      PARAMETROS_DEFECTO.capacidadMinutosDia
    ),
    costosFijosDiarios: comoNumero(
      mapa.get(CLAVES.costosFijosDiarios),
      PARAMETROS_DEFECTO.costosFijosDiarios
    ),
    diasOperacionSemana: comoArrayNumeros(
      mapa.get(CLAVES.diasOperacionSemana),
      PARAMETROS_DEFECTO.diasOperacionSemana
    ),
  };
}

export async function actualizarParametros(
  datos: Partial<Omit<ParametrosApp, "moneda">>
): Promise<void> {
  const entradas = Object.entries(datos) as [
    keyof Omit<ParametrosApp, "moneda">,
    string | number | boolean | number[],
  ][];
  if (entradas.length === 0) return;

  await prisma.$transaction(
    entradas.map(([campo, valor]) =>
      prisma.parametro.upsert({
        where: { clave: CLAVES[campo] },
        create: { clave: CLAVES[campo], valor: serializar(valor) },
        update: { valor: serializar(valor) },
      })
    )
  );
}
