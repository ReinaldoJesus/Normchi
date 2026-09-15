import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { NOMBRE_COOKIE_SESION, verificarTokenSesion } from "@/lib/sesion";

const RUTAS_PUBLICAS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  const sesion = token ? await verificarTokenSesion(token) : null;

  if (!sesion) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("desde", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos, imágenes optimizadas y el favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
