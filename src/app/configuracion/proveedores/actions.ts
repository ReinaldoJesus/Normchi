"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { proveedorFormSchema } from "@/lib/validaciones/proveedor";

export interface EstadoFormularioProveedor {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    contacto: formData.get("contacto"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    leadTimeDias: formData.get("leadTimeDias"),
    condicionPago: formData.get("condicionPago"),
  };
}

function aNuloSiVacio(valor: string): string | null {
  return valor === "" ? null : valor;
}

export async function crearProveedor(
  _prev: EstadoFormularioProveedor,
  formData: FormData
): Promise<EstadoFormularioProveedor> {
  const parsed = proveedorFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const { contacto, telefono, email, condicionPago, ...resto } = parsed.data;
  await prisma.proveedor.create({
    data: {
      ...resto,
      contacto: aNuloSiVacio(contacto),
      telefono: aNuloSiVacio(telefono),
      email: aNuloSiVacio(email),
      condicionPago: aNuloSiVacio(condicionPago),
    },
  });

  revalidatePath("/configuracion/proveedores");
  revalidatePath("/insumos");
  return { ok: true };
}

export async function actualizarProveedor(
  proveedorId: number,
  _prev: EstadoFormularioProveedor,
  formData: FormData
): Promise<EstadoFormularioProveedor> {
  const parsed = proveedorFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const { contacto, telefono, email, condicionPago, ...resto } = parsed.data;
  await prisma.proveedor.update({
    where: { id: proveedorId },
    data: {
      ...resto,
      contacto: aNuloSiVacio(contacto),
      telefono: aNuloSiVacio(telefono),
      email: aNuloSiVacio(email),
      condicionPago: aNuloSiVacio(condicionPago),
    },
  });

  revalidatePath("/configuracion/proveedores");
  revalidatePath("/insumos");
  return { ok: true };
}

export async function cambiarEstadoProveedor(
  proveedorId: number,
  activo: boolean
): Promise<void> {
  await prisma.proveedor.update({ where: { id: proveedorId }, data: { activo } });
  revalidatePath("/configuracion/proveedores");
  revalidatePath("/insumos");
}
