import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export { hashearPassword, verificarPassword } from "./senas";

// Autenticación propia, 100% local: sin Supabase ni ningún servicio externo.
// La contraseña se guarda como hash bcrypt en `usuarios.password_hash` y la
// sesión es un JWT firmado en una cookie httpOnly — no requiere red ni DB
// aparte para validar la sesión en cada request.

const NOMBRE_COOKIE = "normchi_sesion";
const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días

function obtenerSecreto(): Uint8Array {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    throw new Error(
      "Falta AUTH_SECRET en las variables de entorno (ver .env.example)."
    );
  }
  return new TextEncoder().encode(secreto);
}

export interface SesionUsuario {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: "admin" | "compras" | "cocina" | "cajero" | "lectura";
}

export async function crearSesion(datos: SesionUsuario): Promise<void> {
  const token = await new SignJWT({ ...datos })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecreto());

  const jar = await cookies();
  jar.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOMBRE_COOKIE);
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, obtenerSecreto());
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}
