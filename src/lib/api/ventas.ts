import { apiFetch, ApiError } from "./http";
import type { CierreDiaValues } from "@/lib/validaciones/venta";
import type {
  ResumenCierreDia,
  FilaCsvVenta,
  ResultadoImportacionCsv,
} from "@/lib/services/ventas";

export type { ResumenCierreDia, FilaCsvVenta, ResultadoImportacionCsv };

export interface ResultadoCierreDia {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  resumen?: ResumenCierreDia;
}

function errorGenerico(error: unknown): { mensaje?: string; errores?: Record<string, string[] | undefined> } {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { errores: error.cuerpo.errores };
    return { mensaje: error.cuerpo?.error ?? error.message };
  }
  return { mensaje: "No se pudo conectar con el servidor." };
}

export async function guardarCierreDia(datos: CierreDiaValues): Promise<ResultadoCierreDia> {
  try {
    const { resumen } = await apiFetch<{ resumen: ResumenCierreDia }>("/api/ventas", {
      method: "POST",
      body: JSON.stringify(datos),
    });
    return { ok: true, resumen };
  } catch (error) {
    return { ok: false, ...errorGenerico(error) };
  }
}

export async function marcarDiaSinOperacion(
  fecha: string,
  motivo: string
): Promise<{ ok: boolean; mensaje?: string }> {
  try {
    await apiFetch("/api/ventas/dia-sin-operacion", {
      method: "POST",
      body: JSON.stringify({ fecha, motivo }),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, ...errorGenerico(error) };
  }
}

export async function reabrirDia(fecha: string): Promise<void> {
  await apiFetch("/api/ventas/reabrir", { method: "POST", body: JSON.stringify({ fecha }) });
}

export async function importarVentasCsv(filas: FilaCsvVenta[]): Promise<ResultadoImportacionCsv> {
  return apiFetch("/api/ventas/importar", { method: "POST", body: JSON.stringify({ filas }) });
}
