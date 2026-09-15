import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { listarMovimientos } from "@/lib/inventario";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const { searchParams } = new URL(request.url);
    const insumoId = searchParams.has("insumo") ? Number(searchParams.get("insumo")) : null;
    const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
    return NextResponse.json(await listarMovimientos(insumoId, pagina));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
