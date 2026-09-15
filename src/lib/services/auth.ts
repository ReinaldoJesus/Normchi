import "server-only";

import { prisma } from "@/lib/prisma";
import { crearSesion, verificarPassword } from "@/lib/auth";
import type { SesionUsuario } from "@/lib/sesion";

export async function iniciarSesionConCredenciales(
  email: string,
  password: string
): Promise<SesionUsuario | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) return null;

  const passwordValida = await verificarPassword(password, usuario.passwordHash);
  if (!passwordValida) return null;

  const sesion: SesionUsuario = {
    usuarioId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
  await crearSesion(sesion);
  return sesion;
}
