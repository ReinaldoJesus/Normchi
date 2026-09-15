"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { hashearPassword, obtenerSesion } from "@/lib/auth";
import { usuarioActualizarSchema, usuarioCrearSchema } from "@/lib/validaciones/usuario";

export interface EstadoFormularioUsuario {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

async function exigirAdmin(): Promise<void> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "admin") {
    throw new Error("No autorizado.");
  }
}

function datosDesdeFormulario(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
    password: formData.get("password") ?? "",
  };
}

export async function crearUsuario(
  _prev: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  await exigirAdmin();

  const parsed = usuarioCrearSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const existente = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (existente) {
    return { ok: false, errores: { email: ["Ya existe un usuario con este correo"] } };
  }

  await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      rol: parsed.data.rol,
      passwordHash: await hashearPassword(parsed.data.password),
    },
  });

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

export async function actualizarUsuario(
  usuarioId: string,
  _prev: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  await exigirAdmin();

  const parsed = usuarioActualizarSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const existente = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (existente && existente.id !== usuarioId) {
    return { ok: false, errores: { email: ["Ya existe un usuario con este correo"] } };
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      rol: parsed.data.rol,
      ...(parsed.data.password
        ? { passwordHash: await hashearPassword(parsed.data.password) }
        : {}),
    },
  });

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean): Promise<void> {
  await exigirAdmin();

  if (!activo) {
    const sesion = await obtenerSesion();
    if (sesion?.usuarioId === usuarioId) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (usuario?.rol === "admin") {
      const otrosAdminsActivos = await prisma.usuario.count({
        where: { rol: "admin", activo: true, id: { not: usuarioId } },
      });
      if (otrosAdminsActivos === 0) {
        throw new Error("No puedes desactivar al único administrador activo.");
      }
    }
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });
  revalidatePath("/configuracion/usuarios");
}
