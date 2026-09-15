"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { insumoFormSchema } from "@/lib/validaciones/insumo";

export interface EstadoFormularioInsumo {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    unidadBase: formData.get("unidadBase"),
    unidadCompra: formData.get("unidadCompra"),
    factorConversion: formData.get("factorConversion"),
    mermaPorcentaje: formData.get("mermaPorcentaje"),
    stockSeguridad: formData.get("stockSeguridad"),
    loteMinimoCompra: formData.get("loteMinimoCompra"),
    leadTimeDias: formData.get("leadTimeDias"),
    proveedorId: formData.get("proveedorId") ?? undefined,
    perecible: formData.get("perecible") ?? undefined,
    stockInicial: formData.get("stockInicial"),
    costoInicial: formData.get("costoInicial"),
  };
}

export async function crearInsumo(
  _prev: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  const parsed = insumoFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const { mermaPorcentaje, ...datos } = parsed.data;

  try {
    await prisma.insumo.create({
      data: {
        ...datos,
        mermaPct: mermaPorcentaje / 100,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        errores: { codigo: ["Ya existe un insumo con ese código."] },
      };
    }
    throw err;
  }

  revalidatePath("/insumos");
  return { ok: true };
}

export async function actualizarInsumo(
  insumoId: number,
  _prev: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  const parsed = insumoFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const { mermaPorcentaje, unidadBase, ...datos } = parsed.data;

  const existente = await prisma.insumo.findUnique({
    where: { id: insumoId },
    select: {
      unidadBase: true,
      _count: { select: { movimientosInventario: true } },
    },
  });
  if (!existente) {
    return { ok: false, mensajeGeneral: "El insumo ya no existe." };
  }

  const tieneMovimientos = existente._count.movimientosInventario > 0;
  if (tieneMovimientos && unidadBase !== existente.unidadBase) {
    return {
      ok: false,
      errores: {
        unidadBase: [
          "No se puede cambiar la unidad base: el insumo ya tiene movimientos.",
        ],
      },
    };
  }

  try {
    await prisma.insumo.update({
      where: { id: insumoId },
      data: {
        ...datos,
        unidadBase,
        mermaPct: mermaPorcentaje / 100,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        errores: { codigo: ["Ya existe un insumo con ese código."] },
      };
    }
    throw err;
  }

  revalidatePath("/insumos");
  return { ok: true };
}

export async function cambiarEstadoInsumo(
  insumoId: number,
  activo: boolean
): Promise<void> {
  await prisma.insumo.update({ where: { id: insumoId }, data: { activo } });
  revalidatePath("/insumos");
}
