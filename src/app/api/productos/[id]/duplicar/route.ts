import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { duplicarReceta } from "@/lib/services/productos";

const cuerpoSchema = z.object({
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const productoOrigenId = Number((await params).id);
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const nuevo = await duplicarReceta(productoOrigenId, parsed.data.codigo, parsed.data.nombre);
    return NextResponse.json({ nuevoId: nuevo.id }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
