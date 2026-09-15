import { apiFetch, ApiError } from "./http";
import type { AjusteFormValues } from "@/lib/validaciones/ajuste";

export interface ResultadoAjuste {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
}

export async function crearAjuste(datos: AjusteFormValues): Promise<ResultadoAjuste> {
  try {
    await apiFetch("/api/inventario/ajustes", { method: "POST", body: JSON.stringify(datos) });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
      return { ok: false, mensaje: error.message };
    }
    return { ok: false, mensaje: "No se pudo conectar con el servidor." };
  }
}

export async function recalcularInventarioManual(): Promise<void> {
  await apiFetch("/api/inventario/recalcular", { method: "POST" });
}
