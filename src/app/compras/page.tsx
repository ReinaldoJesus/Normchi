import Link from "next/link";
import { Plus } from "lucide-react";

import { listarCompras } from "@/lib/services/compras";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ComprasTable } from "./compras-table";

export default async function ComprasPage() {
  const filas = await listarCompras();

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Órdenes de compra: borrador → pendiente → recibida, con recepción parcial."
        actions={
          <Button asChild>
            <Link href="/compras/nueva">
              <Plus />
              Nueva orden
            </Link>
          </Button>
        }
      />
      <ComprasTable filas={filas} />
    </div>
  );
}
