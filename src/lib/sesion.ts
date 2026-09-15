import { SignJWT, jwtVerify } from "jose";

// Sin "server-only": este módulo lo usa tanto código de servidor normal
// (src/lib/auth.ts) como el proxy (src/proxy.ts), que corre en un bundle
// aparte y no puede usar `next/headers`. Solo contiene la firma/verificación
// del JWT de sesión — nada de acceso a cookies ni a la base de datos.

export const NOMBRE_COOKIE_SESION = "normchi_sesion";
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días

export interface SesionUsuario {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: "admin" | "compras" | "cocina" | "cajero" | "lectura";
}

function obtenerSecreto(): Uint8Array {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    throw new Error(
      "Falta AUTH_SECRET en las variables de entorno (ver .env.example)."
    );
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarTokenSesion(datos: SesionUsuario): Promise<string> {
  return new SignJWT({ ...datos })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecreto());
}

export async function verificarTokenSesion(
  token: string
): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerSecreto());
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}
