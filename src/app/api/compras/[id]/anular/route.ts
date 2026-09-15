import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { anularCompra } from "@/lib/services/compras";

const cuerpoSchema = z.object({ motivo: z.string().optional().default("") });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const parsed = cuerpoSchema.safeParse(await request.json().catch(() => ({})));
    const motivo = parsed.success ? parsed.data.motivo : "";
    await anularCompra(Number((await params).id), motivo);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
