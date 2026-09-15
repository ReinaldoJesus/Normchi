import { NextResponse } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { recalcularInventarioCompleto } from "@/lib/inventario";

export async function POST() {
  try {
    await exigirSesion();
    await recalcularInventarioCompleto();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
