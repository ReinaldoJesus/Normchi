import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { obtenerGastoCompras } from "@/lib/reportes";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const meses = Number(new URL(request.url).searchParams.get("meses")) || undefined;
    return NextResponse.json(await obtenerGastoCompras(meses));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
