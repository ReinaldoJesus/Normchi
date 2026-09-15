import { apiFetch, ApiError } from "./http";

export interface EstadoLogin {
  ok: boolean;
  mensajeGeneral?: string;
}

export async function iniciarSesion(
  _prev: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  try {
    await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, mensajeGeneral: error.message };
    return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
  }
}

export async function cerrarSesion(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
