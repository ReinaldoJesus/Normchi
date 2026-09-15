import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { manejarErrorApi } from "@/lib/apiAuth";
import { iniciarSesionConCredenciales } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validaciones/usuario";

const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: MENSAJE_CREDENCIALES_INVALIDAS }, { status: 400 });
    }

    const sesion = await iniciarSesionConCredenciales(parsed.data.email, parsed.data.password);
    if (!sesion) {
      return NextResponse.json({ error: MENSAJE_CREDENCIALES_INVALIDAS }, { status: 401 });
    }

    return NextResponse.json(sesion);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
