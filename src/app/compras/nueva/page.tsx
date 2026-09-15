import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fechaLocalAhora } from "@/lib/fechas";
import { listarInsumosParaCompra } from "@/lib/services/compras";
import { listarProveedoresConLeadTime } from "@/lib/services/proveedores";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompraForm } from "../compra-form";

export default async function NuevaCompraPage() {
  const [proveedores, insumos] = await Promise.all([
    listarProveedoresConLeadTime(),
    listarInsumosParaCompra(),
  ]);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/compras">
          <ArrowLeft />
          Compras
        </Link>
      </Button>
      <PageHeader
        title="Nueva orden de compra"
        description="Se crea en borrador. El folio se asigna automáticamente."
      />
      <CompraForm
        proveedores={proveedores}
        insumos={insumos}
        fechaHoy={fechaLocalAhora()}
      />
    </div>
  );
}
