import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { crearProveedor, listarProveedores } from "@/lib/services/proveedores";
import { proveedorFormSchema } from "@/lib/validaciones/proveedor";

export async function GET() {
  try {
    await exigirSesion();
    const proveedores = await listarProveedores();
    return NextResponse.json(proveedores);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirSesion();
    const parsed = proveedorFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const proveedor = await crearProveedor(parsed.data);
    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
