import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearOverride } from "@/lib/planificacion";

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const override = await crearOverride(await request.json());
    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
