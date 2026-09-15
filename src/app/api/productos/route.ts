import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearProducto, listarProductosConCosteo } from "@/lib/services/productos";
import { productoFormSchema } from "@/lib/validaciones/producto";

export async function GET() {
  try {
    await exigirSesion();
    return NextResponse.json(await listarProductosConCosteo());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = productoFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const producto = await crearProducto(parsed.data);
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
