import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { recibirCompra } from "@/lib/services/compras";

const cuerpoSchema = z.object({
  fechaRecepcion: z.string().min(1),
  lineas: z.array(
    z.object({
      compraLineaId: z.number().int(),
      cantidadRecibida: z.number(),
      precioUnitarioCompra: z.number(),
    })
  ),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const compraId = Number((await params).id);
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await recibirCompra(compraId, parsed.data.fechaRecepcion, parsed.data.lineas);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
