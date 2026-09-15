import { apiFetch, ApiError } from "./http";
import type { OverrideFormValues } from "@/lib/validaciones/forecastOverride";

export interface ResultadoOverride {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
}

export interface ResultadoAccionCompra {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  compraId?: number;
}

export interface LineaSugerenciaInput {
  insumoId: number;
  cantidadCompra: number;
  precioUnitarioCompra: number;
}

function errorGenerico(error: unknown): { mensaje?: string; errores?: Record<string, string[] | undefined> } {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { errores: error.cuerpo.errores };
    return { mensaje: error.cuerpo?.error ?? error.message };
  }
  return { mensaje: "No se pudo conectar con el servidor." };
}

export async function crearOverride(datos: OverrideFormValues): Promise<ResultadoOverride> {
  try {
    await apiFetch("/api/planificacion/overrides", { method: "POST", body: JSON.stringify(datos) });
    return { ok: true };
  } catch (error) {
    return { ok: false, ...errorGenerico(error) };
  }
}

export async function eliminarOverride(id: number): Promise<void> {
  await apiFetch(`/api/planificacion/overrides/${id}`, { method: "DELETE" });
}

export async function generarOrdenDesdeSugerencia(
  proveedorId: number,
  lineas: LineaSugerenciaInput[]
): Promise<ResultadoAccionCompra> {
  try {
    const compra = await apiFetch<{ compraId: number }>("/api/planificacion/generar-orden", {
      method: "POST",
      body: JSON.stringify({ proveedorId, lineas }),
    });
    return { ok: true, compraId: compra.compraId };
  } catch (error) {
    return { ok: false, ...errorGenerico(error) };
  }
}
