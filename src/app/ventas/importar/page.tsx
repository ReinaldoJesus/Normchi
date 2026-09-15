import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ImportarForm } from "./importar-form";

export default function ImportarVentasPage() {
  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/ventas">
          <ArrowLeft />
          Ventas
        </Link>
      </Button>
      <PageHeader
        title="Importar ventas desde CSV"
        description="Útil para cargar el histórico inicial. Las filas válidas se importan aunque otras fallen."
      />
      <ImportarForm />
    </div>
  );
}
