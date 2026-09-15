import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { obtenerConsumoTeoricoVsAjustes } from "@/lib/reportes";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const dias = Number(new URL(request.url).searchParams.get("dias")) || undefined;
    return NextResponse.json(await obtenerConsumoTeoricoVsAjustes(dias));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
