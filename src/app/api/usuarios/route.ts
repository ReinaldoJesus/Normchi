import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirAdmin, manejarErrorApi } from "@/lib/apiAuth";
import { crearUsuario, listarUsuarios } from "@/lib/services/usuarios";
import { usuarioCrearSchema } from "@/lib/validaciones/usuario";

export async function GET() {
  try {
    await exigirAdmin();
    return NextResponse.json(await listarUsuarios());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await exigirAdmin();
    const parsed = usuarioCrearSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const usuario = await crearUsuario(parsed.data);
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
