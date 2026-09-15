import Link from "next/link";
import { ArrowRight, Sliders, Truck, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obtenerSesion } from "@/lib/auth";

const SECCIONES = [
  {
    href: "/configuracion/proveedores",
    titulo: "Proveedores",
    descripcion: "Contacto, condiciones y lead time por defecto.",
    icon: Truck,
    soloAdmin: false,
  },
  {
    href: "/configuracion/parametros",
    titulo: "Parámetros",
    descripcion: "IVA, horizonte de planificación, capacidad de cocina y más.",
    icon: Sliders,
    soloAdmin: true,
  },
  {
    href: "/configuracion/usuarios",
    titulo: "Usuarios",
    descripcion: "Cuentas y roles: admin, compras, cocina, cajero, lectura.",
    icon: Users,
    soloAdmin: true,
  },
] as const;

export default async function ConfiguracionPage() {
  const sesion = await obtenerSesion();
  const esAdmin = sesion?.rol === "admin";
  const secciones = SECCIONES.filter((s) => !s.soloAdmin || esAdmin);

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Parámetros del sistema, proveedores y usuarios."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secciones.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <s.icon className="mb-1 h-5 w-5 text-muted-foreground" />
                <CardTitle className="flex items-center justify-between text-base">
                  {s.titulo}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{s.descripcion}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
