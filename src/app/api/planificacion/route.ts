import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { obtenerPlanificacion } from "@/lib/planificacion";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const { searchParams } = new URL(request.url);
    const horizonteParam = Number(searchParams.get("horizonte")) || undefined;
    return NextResponse.json(await obtenerPlanificacion(horizonteParam));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
