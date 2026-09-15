import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios } from "@/lib/services/usuarios";
import { UsuarioForm } from "./usuario-form";
import { UsuariosTable, type FilaUsuario } from "./usuarios-table";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "admin") redirect("/");

  const usuarios = await listarUsuarios();

  const filas: FilaUsuario[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    esUsuarioActual: u.id === sesion.usuarioId,
    form: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol },
  }));

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/configuracion">
          <ArrowLeft />
          Configuración
        </Link>
      </Button>

      <PageHeader
        title="Usuarios"
        description="Cuentas del sistema y sus roles. Solo un administrador puede gestionarlas."
        actions={<UsuarioForm />}
      />

      <UsuariosTable filas={filas} />
    </div>
  );
}
