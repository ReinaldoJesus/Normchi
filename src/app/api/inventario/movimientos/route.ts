import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { listarMovimientos, TAMANOS_PAGINA_MOVIMIENTOS } from "@/lib/inventario";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const { searchParams } = new URL(request.url);
    const insumoId = searchParams.has("insumo") ? Number(searchParams.get("insumo")) : null;
    const categoria = searchParams.get("categoria") || null;
    const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
    const tamanoPaginaParam = Number(searchParams.get("tamanoPagina"));
    const tamanoPagina = TAMANOS_PAGINA_MOVIMIENTOS.includes(
      tamanoPaginaParam as (typeof TAMANOS_PAGINA_MOVIMIENTOS)[number]
    )
      ? tamanoPaginaParam
      : undefined;
    return NextResponse.json(await listarMovimientos(insumoId, pagina, tamanoPagina, categoria));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
