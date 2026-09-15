import "server-only";

import { prisma } from "@/lib/prisma";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedor";

function aNuloSiVacio(valor: string): string | null {
  return valor === "" ? null : valor;
}

export async function listarProveedores() {
  return prisma.proveedor.findMany({ orderBy: { nombre: "asc" } });
}

export async function listarProveedoresActivos() {
  return prisma.proveedor.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listarProveedoresConLeadTime() {
  return prisma.proveedor.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, leadTimeDias: true },
    orderBy: { nombre: "asc" },
  });
}

export async function crearProveedor(datos: ProveedorFormValues) {
  const { contacto, telefono, email, condicionPago, ...resto } = datos;
  return prisma.proveedor.create({
    data: {
      ...resto,
      contacto: aNuloSiVacio(contacto),
      telefono: aNuloSiVacio(telefono),
      email: aNuloSiVacio(email),
      condicionPago: aNuloSiVacio(condicionPago),
    },
  });
}

export async function actualizarProveedor(proveedorId: number, datos: ProveedorFormValues) {
  const { contacto, telefono, email, condicionPago, ...resto } = datos;
  return prisma.proveedor.update({
    where: { id: proveedorId },
    data: {
      ...resto,
      contacto: aNuloSiVacio(contacto),
      telefono: aNuloSiVacio(telefono),
      email: aNuloSiVacio(email),
      condicionPago: aNuloSiVacio(condicionPago),
    },
  });
}

export async function cambiarEstadoProveedor(proveedorId: number, activo: boolean) {
  return prisma.proveedor.update({ where: { id: proveedorId }, data: { activo } });
}
