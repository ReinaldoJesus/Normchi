"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora } from "@/lib/fechas";
import { overrideFormSchema, type OverrideFormValues } from "@/lib/validaciones/forecastOverride";
import { crearCompra, type ResultadoAccionCompra } from "@/app/compras/actions";

export interface ResultadoOverride {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
}

export async function crearOverride(datos: OverrideFormValues): Promise<ResultadoOverride> {
  const parsed = overrideFormSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  await prisma.forecastOverride.upsert({
    where: {
      productoId_fecha: { productoId: parsed.data.productoId, fecha: new Date(parsed.data.fecha) },
    },
    update: { cantidad: parsed.data.cantidad, motivo: parsed.data.motivo || null },
    create: {
      productoId: parsed.data.productoId,
      fecha: new Date(parsed.data.fecha),
      cantidad: parsed.data.cantidad,
      motivo: parsed.data.motivo || null,
    },
  });

  revalidatePath("/planificacion");
  return { ok: true };
}

export async function eliminarOverride(id: number): Promise<void> {
  await prisma.forecastOverride.delete({ where: { id } });
  revalidatePath("/planificacion");
}

export interface LineaSugerenciaInput {
  insumoId: number;
  cantidadCompra: number;
  precioUnitarioCompra: number;
}

export async function generarOrdenDesdeSugerencia(
  proveedorId: number,
  lineas: LineaSugerenciaInput[]
): Promise<ResultadoAccionCompra> {
  if (lineas.length === 0) {
    return { ok: false, mensaje: "No hay líneas seleccionadas." };
  }

  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) return { ok: false, mensaje: "Proveedor no encontrado." };

  const hoy = fechaLocalAhora();
  const dHoy = new Date(`${hoy}T00:00:00Z`);
  dHoy.setUTCDate(dHoy.getUTCDate() + proveedor.leadTimeDias);
  const fechaEsperada = dHoy.toISOString().slice(0, 10);

  const resultado = await crearCompra({
    proveedorId,
    fechaEmision: hoy,
    fechaEsperada,
    documento: "",
    nota: "Generada desde la sugerencia de compra (Planificación).",
    lineas,
  });

  revalidatePath("/planificacion");
  revalidatePath("/compras");
  return resultado;
}
