import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { importarVentasCsv } from "@/lib/services/ventas";

const filaSchema = z.object({
  fecha: z.string(),
  codigoProducto: z.string(),
  cantidad: z.string(),
  precioUnitario: z.string(),
  canal: z.string(),
});
const cuerpoSchema = z.object({ filas: z.array(filaSchema) });

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    return NextResponse.json(await importarVentasCsv(parsed.data.filas));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
