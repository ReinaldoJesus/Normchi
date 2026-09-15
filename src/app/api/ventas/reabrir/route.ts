import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { reabrirDia } from "@/lib/services/ventas";

const cuerpoSchema = z.object({ fecha: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await reabrirDia(parsed.data.fecha);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
