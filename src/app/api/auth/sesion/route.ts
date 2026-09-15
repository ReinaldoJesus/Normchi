import { NextResponse } from "next/server";

import { obtenerSesion } from "@/lib/auth";
import { manejarErrorApi } from "@/lib/apiAuth";

export async function GET() {
  try {
    const sesion = await obtenerSesion();
    return NextResponse.json({ sesion });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
