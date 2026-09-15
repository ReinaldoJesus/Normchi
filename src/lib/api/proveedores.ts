import { apiFetch, ApiError } from "./http";

export interface EstadoFormularioProveedor {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    contacto: formData.get("contacto"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    leadTimeDias: formData.get("leadTimeDias"),
    condicionPago: formData.get("condicionPago"),
  };
}

function errorComoEstado(error: unknown): EstadoFormularioProveedor {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
    return { ok: false, mensajeGeneral: error.message };
  }
  return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
}

export async function crearProveedor(
  _prev: EstadoFormularioProveedor,
  formData: FormData
): Promise<EstadoFormularioProveedor> {
  try {
    await apiFetch("/api/proveedores", {
      method: "POST",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function actualizarProveedor(
  proveedorId: number,
  _prev: EstadoFormularioProveedor,
  formData: FormData
): Promise<EstadoFormularioProveedor> {
  try {
    await apiFetch(`/api/proveedores/${proveedorId}`, {
      method: "PATCH",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function cambiarEstadoProveedor(proveedorId: number, activo: boolean): Promise<void> {
  await apiFetch(`/api/proveedores/${proveedorId}`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}
