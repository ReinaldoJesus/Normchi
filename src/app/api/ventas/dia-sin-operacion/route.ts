import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { marcarDiaSinOperacion } from "@/lib/services/ventas";

const cuerpoSchema = z.object({ fecha: z.string().min(1), motivo: z.string().optional().default("") });

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await marcarDiaSinOperacion(parsed.data.fecha, parsed.data.motivo);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
