import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { actualizarInsumo, cambiarEstadoInsumo } from "@/lib/services/insumos";
import { insumoFormSchema } from "@/lib/validaciones/insumo";

const cambioEstadoSchema = z.object({ activo: z.boolean() }).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await exigirSesion();
    const insumoId = Number((await params).id);
    const body = await request.json();

    const soloEstado = cambioEstadoSchema.safeParse(body);
    if (soloEstado.success) {
      const insumo = await cambiarEstadoInsumo(insumoId, soloEstado.data.activo);
      return NextResponse.json(insumo);
    }

    const parsed = insumoFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const insumo = await actualizarInsumo(insumoId, parsed.data);
    return NextResponse.json(insumo);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
