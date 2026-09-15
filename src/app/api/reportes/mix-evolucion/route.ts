import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { obtenerMixEvolucion } from "@/lib/reportes";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const semanas = Number(new URL(request.url).searchParams.get("semanas")) || undefined;
    return NextResponse.json(await obtenerMixEvolucion(semanas));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
