import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirAdmin, manejarErrorApi } from "@/lib/apiAuth";
import { actualizarUsuario } from "@/lib/services/usuarios";
import { usuarioActualizarSchema } from "@/lib/validaciones/usuario";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await exigirAdmin();
    const usuarioId = (await params).id;
    const parsed = usuarioActualizarSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errores: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const usuario = await actualizarUsuario(usuarioId, parsed.data);
    return NextResponse.json(usuario);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
