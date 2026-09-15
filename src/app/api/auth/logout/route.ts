import { NextResponse } from "next/server";

import { cerrarSesion } from "@/lib/auth";
import { manejarErrorApi } from "@/lib/apiAuth";

export async function POST() {
  try {
    await cerrarSesion();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
