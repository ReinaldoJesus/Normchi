import { apiFetch, ApiError } from "./http";

export interface EstadoFormularioInsumo {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    unidadBase: formData.get("unidadBase"),
    unidadCompra: formData.get("unidadCompra"),
    factorConversion: formData.get("factorConversion"),
    mermaPorcentaje: formData.get("mermaPorcentaje"),
    stockSeguridad: formData.get("stockSeguridad"),
    loteMinimoCompra: formData.get("loteMinimoCompra"),
    leadTimeDias: formData.get("leadTimeDias"),
    proveedorId: formData.get("proveedorId") ?? undefined,
    perecible: formData.get("perecible") ?? undefined,
    stockInicial: formData.get("stockInicial"),
    costoInicial: formData.get("costoInicial"),
  };
}

function errorComoEstado(error: unknown): EstadoFormularioInsumo {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
    return { ok: false, mensajeGeneral: error.message };
  }
  return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
}

export async function crearInsumo(
  _prev: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  try {
    await apiFetch("/api/insumos", {
      method: "POST",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function actualizarInsumo(
  insumoId: number,
  _prev: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  try {
    await apiFetch(`/api/insumos/${insumoId}`, {
      method: "PATCH",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function cambiarEstadoInsumo(insumoId: number, activo: boolean): Promise<void> {
  await apiFetch(`/api/insumos/${insumoId}`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}
