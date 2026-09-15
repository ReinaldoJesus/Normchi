import "server-only";
import { NextResponse } from "next/server";

import { obtenerSesion } from "@/lib/auth";
import type { SesionUsuario } from "@/lib/sesion";

export class ErrorApi extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Error de validación de negocio atado a un campo específico del formulario (ej. código duplicado). */
export class ErrorCampo extends Error {
  constructor(
    public campo: string,
    mensaje: string
  ) {
    super(mensaje);
  }
}

/** Errores de validación de Zod (varios campos a la vez), reenviados tal cual desde un route handler. */
export class ErrorValidacion extends Error {
  constructor(public errores: Record<string, string[] | undefined>) {
    super("Datos inválidos");
  }
}

/**
 * El proxy (src/proxy.ts) ya bloquea /api/** sin sesión, pero cada route
 * handler vuelve a exigirla — nunca confiar solo en el matcher del proxy.
 */
export async function exigirSesion(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new ErrorApi(401, "No autenticado");
  return sesion;
}

export async function exigirAdmin(): Promise<SesionUsuario> {
  const sesion = await exigirSesion();
  if (sesion.rol !== "admin") throw new ErrorApi(403, "No autorizado");
  return sesion;
}

/** Traduce una excepción a la respuesta JSON de error de un route handler. */
export function manejarErrorApi(error: unknown): NextResponse {
  if (error instanceof ErrorCampo) {
    return NextResponse.json({ errores: { [error.campo]: [error.message] } }, { status: 400 });
  }
  if (error instanceof ErrorValidacion) {
    return NextResponse.json({ errores: error.errores }, { status: 400 });
  }
  if (error instanceof ErrorApi) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
