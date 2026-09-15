import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { fechaLocalAhora } from "@/lib/fechas";
import { guardarCierreDia, obtenerDatosCierreDia } from "@/lib/services/ventas";

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha") ?? fechaLocalAhora();
    const canal = searchParams.get("canal") ?? "salon";
    return NextResponse.json(await obtenerDatosCierreDia(fecha, canal));
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const resumen = await guardarCierreDia(await request.json());
    return NextResponse.json({ resumen });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
