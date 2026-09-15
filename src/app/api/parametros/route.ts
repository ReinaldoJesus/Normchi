import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirAdmin, manejarErrorApi } from "@/lib/apiAuth";
import { actualizarParametros, obtenerParametros } from "@/lib/parametros";
import { parametrosFormSchema } from "@/lib/validaciones/parametros";

export async function GET() {
  try {
    await exigirAdmin();
    return NextResponse.json(await obtenerParametros());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await exigirAdmin();
    const parsed = parametrosFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    await actualizarParametros(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
