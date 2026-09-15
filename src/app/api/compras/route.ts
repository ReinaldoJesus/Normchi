import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearCompra, listarCompras } from "@/lib/services/compras";

export async function GET() {
  try {
    await exigirSesion();
    return NextResponse.json(await listarCompras());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const compra = await crearCompra(await request.json());
    return NextResponse.json(compra, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
