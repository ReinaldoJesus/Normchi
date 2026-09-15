import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { fechaLocalAhora } from "@/lib/fechas";
import { listarHistorialVentas } from "@/lib/services/ventas";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes") ?? fechaLocalAhora().slice(0, 7);
    return NextResponse.json(await listarHistorialVentas(mes));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
