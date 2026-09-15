import "server-only";

import { prisma } from "@/lib/prisma";
import { hashearPassword } from "@/lib/auth";
import { ErrorApi, ErrorCampo } from "@/lib/apiAuth";
import type { RolUsuario } from "@/lib/validaciones/usuario";

export interface DatosUsuario {
  nombre: string;
  email: string;
  rol: RolUsuario;
  password: string;
}

export async function listarUsuarios() {
  return prisma.usuario.findMany({ orderBy: { creadoEn: "asc" } });
}

export async function crearUsuario(datos: DatosUsuario) {
  const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existente) throw new ErrorCampo("email", "Ya existe un usuario con este correo");

  return prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      rol: datos.rol,
      passwordHash: await hashearPassword(datos.password),
    },
  });
}

export async function actualizarUsuario(
  usuarioId: string,
  datos: Omit<DatosUsuario, "password"> & { password: string }
) {
  const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existente && existente.id !== usuarioId) {
    throw new ErrorCampo("email", "Ya existe un usuario con este correo");
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nombre: datos.nombre,
      email: datos.email,
      rol: datos.rol,
      ...(datos.password ? { passwordHash: await hashearPassword(datos.password) } : {}),
    },
  });
}

export async function cambiarEstadoUsuario(
  usuarioId: string,
  activo: boolean,
  usuarioActualId: string
) {
  if (!activo) {
    if (usuarioActualId === usuarioId) {
      throw new ErrorApi(400, "No puedes desactivar tu propia cuenta.");
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (usuario?.rol === "admin") {
      const otrosAdminsActivos = await prisma.usuario.count({
        where: { rol: "admin", activo: true, id: { not: usuarioId } },
      });
      if (otrosAdminsActivos === 0) {
        throw new ErrorApi(400, "No puedes desactivar al único administrador activo.");
      }
    }
  }

  return prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });
}
