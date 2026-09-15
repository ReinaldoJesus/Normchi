"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { ajusteFormSchema, type AjusteFormValues } from "@/lib/validaciones/ajuste";

export interface ResultadoAjuste {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
}

export async function crearAjuste(datos: AjusteFormValues): Promise<ResultadoAjuste> {
  const parsed = ajusteFormSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const usuarioId = await obtenerUsuarioActualId();

  await prisma.ajusteInventario.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      insumoId: parsed.data.insumoId,
      cantidadDelta: parsed.data.cantidadDelta,
      motivo: parsed.data.motivo,
      nota: parsed.data.nota || null,
      usuarioId,
    },
  });

  await recalcularInventarioCompleto();

  revalidatePath("/inventario");
  revalidatePath("/insumos");
  revalidatePath("/recetas");
  return { ok: true };
}

export async function recalcularInventarioManual(): Promise<void> {
  await recalcularInventarioCompleto();
  revalidatePath("/inventario");
  revalidatePath("/insumos");
  revalidatePath("/recetas");
}
