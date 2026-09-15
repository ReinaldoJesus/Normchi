import { apiFetch, ApiError } from "./http";

export interface EstadoFormularioUsuario {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
    password: formData.get("password") ?? "",
  };
}

function errorComoEstado(error: unknown): EstadoFormularioUsuario {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
    return { ok: false, mensajeGeneral: error.message };
  }
  return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
}

export async function crearUsuario(
  _prev: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  try {
    await apiFetch("/api/usuarios", {
      method: "POST",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function actualizarUsuario(
  usuarioId: string,
  _prev: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  try {
    await apiFetch(`/api/usuarios/${usuarioId}`, {
      method: "PATCH",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean): Promise<void> {
  await apiFetch(`/api/usuarios/${usuarioId}/estado`, {
    method: "POST",
    body: JSON.stringify({ activo }),
  });
}
