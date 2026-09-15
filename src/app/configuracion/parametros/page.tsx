import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { obtenerParametros } from "@/lib/parametros";
import { ParametrosForm } from "./parametros-form";

export default async function ParametrosPage() {
  const parametros = await obtenerParametros();

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/configuracion">
          <ArrowLeft />
          Configuración
        </Link>
      </Button>

      <PageHeader
        title="Parámetros"
        description="Valores usados en el costeo de recetas, la planificación y la reportería. Cambiarlos no requiere tocar código."
      />

      <ParametrosForm parametros={parametros} />
    </div>
  );
}
