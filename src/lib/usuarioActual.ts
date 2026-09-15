import { prisma } from "./prisma";

/**
 * Sustituto temporal mientras no existe login (§7.1 /configuracion → Usuarios,
 * aún no construido). Devuelve el primer usuario activo para poblar los
 * campos de auditoría (creado_por) y usuario_id de los ajustes de inventario.
 * Reemplazar por `obtenerSesion()` (src/lib/auth.ts) cuando exista la
 * pantalla de login.
 */
export async function obtenerUsuarioActualId(): Promise<string> {
  const usuario = await prisma.usuario.findFirst({
    where: { activo: true },
    orderBy: { creadoEn: "asc" },
    select: { id: true },
  });
  if (!usuario) {
    throw new Error(
      "No hay usuarios en el sistema. Ejecuta `npm run seed` para crear el usuario administrador."
    );
  }
  return usuario.id;
}
