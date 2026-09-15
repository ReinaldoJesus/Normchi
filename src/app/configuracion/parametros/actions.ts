"use server";

import { revalidatePath } from "next/cache";

import { actualizarParametros } from "@/lib/parametros";
import { parametrosFormSchema } from "@/lib/validaciones/parametros";

export interface EstadoFormularioParametros {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

export async function guardarParametros(
  _prev: EstadoFormularioParametros,
  formData: FormData
): Promise<EstadoFormularioParametros> {
  const parsed = parametrosFormSchema.safeParse({
    ivaPct: Number(formData.get("ivaPctPorcentaje")) / 100,
    preciosIncluyenIva: formData.get("preciosIncluyenIva") === "on",
    horizontePlanificacionDias: formData.get("horizontePlanificacionDias"),
    ventanaHistorialDias: formData.get("ventanaHistorialDias"),
    alphaSuavizamiento: formData.get("alphaSuavizamiento"),
    capacidadMinutosDia: formData.get("capacidadMinutosDia"),
    costosFijosDiarios: formData.get("costosFijosDiarios"),
    diasOperacionSemana: formData.getAll("diasOperacionSemana"),
  });

  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  await actualizarParametros(parsed.data);

  // Los parámetros alimentan el costeo de recetas, la planificación y la
  // reportería — invalidar todas las páginas que los leen.
  revalidatePath("/configuracion/parametros");
  revalidatePath("/recetas");
  revalidatePath("/planificacion");
  revalidatePath("/reportes");

  return { ok: true };
}
