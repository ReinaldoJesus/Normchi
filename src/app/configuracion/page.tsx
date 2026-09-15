import Link from "next/link";
import { ArrowRight, Sliders, Truck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SECCIONES = [
  {
    href: "/configuracion/proveedores",
    titulo: "Proveedores",
    descripcion: "Contacto, condiciones y lead time por defecto.",
    icon: Truck,
    disponible: true,
  },
  {
    href: "/configuracion/parametros",
    titulo: "Parámetros",
    descripcion: "IVA, horizonte de planificación, capacidad de cocina y más.",
    icon: Sliders,
    disponible: true,
  },
] as const;

export default function ConfiguracionPage() {
  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Parámetros del sistema y proveedores. Uso local de un solo usuario por ahora."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES.map((s) => {
          const contenido = (
            <Card
              className={
                s.disponible
                  ? "h-full transition-colors hover:border-primary/40"
                  : "h-full opacity-60"
              }
            >
              <CardHeader>
                <s.icon className="mb-1 h-5 w-5 text-muted-foreground" />
                <CardTitle className="flex items-center justify-between text-base">
                  {s.titulo}
                  {s.disponible ? (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                </CardTitle>
                <CardDescription>{s.descripcion}</CardDescription>
              </CardHeader>
              {!s.disponible ? (
                <CardContent>
                  <p className="text-xs text-muted-foreground">Próximamente</p>
                </CardContent>
              ) : null}
            </Card>
          );

          return s.disponible ? (
            <Link key={s.href} href={s.href}>
              {contenido}
            </Link>
          ) : (
            <div key={s.href}>{contenido}</div>
          );
        })}
      </div>
    </div>
  );
}
