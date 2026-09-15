import Link from "next/link";
import { ArrowRight, ChefHat, Package, Receipt } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PASOS = [
  {
    numero: 1,
    href: "/insumos",
    titulo: "Carga tus insumos",
    descripcion:
      "Materias primas con unidad base, unidad de compra y proveedor.",
    icon: Package,
    cta: "Ir a Insumos",
  },
  {
    numero: 2,
    href: "/recetas",
    titulo: "Arma tus recetas",
    descripcion:
      "Define el BOM de cada plato para conocer su costo real y margen.",
    icon: ChefHat,
    cta: "Ir a Recetas",
  },
  {
    numero: 3,
    href: "/ventas",
    titulo: "Registra tu primera venta",
    descripcion:
      "El cierre de día alimenta el inventario, el margen y el pronóstico.",
    icon: Receipt,
    cta: "Ir a Ventas",
  },
] as const;

export default function PanelPage() {
  // TODO: una vez conectada la base de datos, mostrar los indicadores reales
  // de §7.2 cuando exista al menos una venta registrada; hasta entonces, la
  // instalación se considera nueva y se muestra esta guía en su lugar.
  const instalacionNueva = true;

  if (instalacionNueva) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Bienvenido a Normchi"
          description="Tres pasos para dejar el sistema operando y empezar a ver costos, inventario y margen en tiempo real."
        />
        <div className="flex flex-col gap-4">
          {PASOS.map((paso) => (
            <Card key={paso.numero} className="border-border/60">
              <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {paso.numero}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{paso.titulo}</CardTitle>
                  <CardDescription className="mt-1">
                    {paso.descripcion}
                  </CardDescription>
                </div>
                <paso.icon className="mt-1 hidden h-5 w-5 text-muted-foreground sm:block" />
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" size="sm">
                  <Link href={paso.href}>
                    {paso.cta}
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Panel" description="Hoy · 7 días · 30 días · mes actual" />
      <p className="text-sm text-muted-foreground">
        Los indicadores del período (§7.2) se conectan cuando el motor esté
        cableado a la base de datos.
      </p>
    </div>
  );
}
