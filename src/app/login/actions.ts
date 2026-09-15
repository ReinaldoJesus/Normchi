"use server";

import { prisma } from "@/lib/prisma";
import { crearSesion, verificarPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validaciones/usuario";

export interface EstadoLogin {
  ok: boolean;
  mensajeGeneral?: string;
}

const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export async function iniciarSesion(
  _prev: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, mensajeGeneral: MENSAJE_CREDENCIALES_INVALIDAS };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  });
  if (!usuario || !usuario.activo) {
    return { ok: false, mensajeGeneral: MENSAJE_CREDENCIALES_INVALIDAS };
  }

  const passwordValida = await verificarPassword(parsed.data.password, usuario.passwordHash);
  if (!passwordValida) {
    return { ok: false, mensajeGeneral: MENSAJE_CREDENCIALES_INVALIDAS };
  }

  await crearSesion({
    usuarioId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });

  return { ok: true };
}
