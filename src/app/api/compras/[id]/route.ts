import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { actualizarCompra, obtenerCompra } from "@/lib/services/compras";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const datos = await obtenerCompra(Number((await params).id));
    if (!datos) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(datos);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await exigirSesion();
    const compraId = Number((await params).id);
    const resultado = await actualizarCompra(compraId, await request.json());
    return NextResponse.json(resultado);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
