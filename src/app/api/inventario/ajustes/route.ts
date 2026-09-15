import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearAjuste, listarAjustesRecientes } from "@/lib/inventario";

export async function GET() {
  try {
    await exigirSesion();
    return NextResponse.json(await listarAjustesRecientes());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    await crearAjuste(await request.json());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
