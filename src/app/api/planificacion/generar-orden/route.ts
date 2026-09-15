import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { generarOrdenDesdeSugerencia } from "@/lib/planificacion";

const cuerpoSchema = z.object({
  proveedorId: z.number().int(),
  lineas: z.array(
    z.object({
      insumoId: z.number().int(),
      cantidadCompra: z.number(),
      precioUnitarioCompra: z.number(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = cuerpoSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.lineas.length === 0) {
      return NextResponse.json({ error: "No hay líneas seleccionadas." }, { status: 400 });
    }
    const compra = await generarOrdenDesdeSugerencia(parsed.data.proveedorId, parsed.data.lineas);
    return NextResponse.json({ compraId: compra.id }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
