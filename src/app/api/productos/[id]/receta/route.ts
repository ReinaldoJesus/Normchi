import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { guardarReceta } from "@/lib/services/productos";

const lineaSchema = z.object({
  insumoId: z.coerce.number().int(),
  cantidad: z.coerce.number().positive(),
  nota: z.string().optional(),
});
const cuerpoSchema = z.object({ lineas: z.array(lineaSchema) });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const productoId = Number((await params).id);
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await guardarReceta(productoId, parsed.data.lineas);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
