import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { exigirAdmin, manejarErrorApi } from "@/lib/apiAuth";
import { cambiarEstadoUsuario } from "@/lib/services/usuarios";

const cambioEstadoSchema = z.object({ activo: z.boolean() }).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sesion = await exigirAdmin();
    const usuarioId = (await params).id;
    const parsed = cambioEstadoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    const usuario = await cambiarEstadoUsuario(usuarioId, parsed.data.activo, sesion.usuarioId);
    return NextResponse.json(usuario);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
