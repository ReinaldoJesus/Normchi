import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearInsumo, listarInsumosConEstado } from "@/lib/services/insumos";
import { insumoFormSchema } from "@/lib/validaciones/insumo";

export async function GET() {
  try {
    await exigirSesion();
    const insumos = await listarInsumosConEstado();
    return NextResponse.json(insumos);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = insumoFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const insumo = await crearInsumo(parsed.data);
    return NextResponse.json(insumo, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
