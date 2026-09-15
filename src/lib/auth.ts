import "server-only";
import { cookies } from "next/headers";

import {
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
  firmarTokenSesion,
  verificarTokenSesion,
  type SesionUsuario,
} from "./sesion";

export type { SesionUsuario };
export { hashearPassword, verificarPassword } from "./senas";

// Autenticación propia, 100% local: sin Supabase ni ningún servicio externo.
// La contraseña se guarda como hash bcrypt en `usuarios.password_hash` y la
// sesión es un JWT firmado en una cookie httpOnly — no requiere red ni DB
// aparte para validar la sesión en cada request. La firma/verificación del
// token vive en src/lib/sesion.ts porque también la usa el proxy (que no
// puede importar `next/headers`).

export async function crearSesion(datos: SesionUsuario): Promise<void> {
  const token = await firmarTokenSesion(datos);

  const jar = await cookies();
  jar.set(NOMBRE_COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOMBRE_COOKIE_SESION);
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE_SESION)?.value;
  if (!token) return null;
  return verificarTokenSesion(token);
}
