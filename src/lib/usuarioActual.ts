import "server-only";
import { obtenerSesion } from "./auth";

/**
 * Id del usuario autenticado, para los campos de auditoría (creado_por,
 * usuario_id de ajustes de inventario, etc.). El proxy (src/proxy.ts) ya
 * garantiza que no se llega aquí sin sesión válida en un flujo normal de UI;
 * este error solo debería verse si una acción de servidor se invoca fuera de
 * ese flujo.
 */
export async function obtenerUsuarioActualId(): Promise<string> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new Error("No hay sesión activa.");
  }
  return sesion.usuarioId;
}
