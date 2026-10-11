import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { duplicarCompra } from "@/lib/services/compras";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const compra = await duplicarCompra(Number((await params).id));
    return NextResponse.json({ id: compra.id }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
