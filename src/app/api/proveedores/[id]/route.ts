import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { actualizarProveedor, cambiarEstadoProveedor } from "@/lib/services/proveedores";
import { proveedorFormSchema } from "@/lib/validaciones/proveedor";

const cambioEstadoSchema = z.object({ activo: z.boolean() }).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await exigirSesion();
    const proveedorId = Number((await params).id);
    const body = await request.json();

    const soloEstado = cambioEstadoSchema.safeParse(body);
    if (soloEstado.success) {
      const proveedor = await cambiarEstadoProveedor(proveedorId, soloEstado.data.activo);
      return NextResponse.json(proveedor);
    }

    const parsed = proveedorFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const proveedor = await actualizarProveedor(proveedorId, parsed.data);
    return NextResponse.json(proveedor);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
