import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import {
  actualizarProducto,
  cambiarEstadoProducto,
  obtenerProductoParaEditor,
} from "@/lib/services/productos";
import { productoFormSchema } from "@/lib/validaciones/producto";

const cambioEstadoSchema = z.object({ activo: z.boolean() }).strict();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirSesion();
    const productoId = Number((await params).id);
    const datos = await obtenerProductoParaEditor(productoId);
    if (!datos) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(datos);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await exigirSesion();
    const productoId = Number((await params).id);
    const body = await request.json();

    const soloEstado = cambioEstadoSchema.safeParse(body);
    if (soloEstado.success) {
      const producto = await cambiarEstadoProducto(productoId, soloEstado.data.activo);
      return NextResponse.json(producto);
    }

    const parsed = productoFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const producto = await actualizarProducto(productoId, parsed.data);
    return NextResponse.json(producto);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
