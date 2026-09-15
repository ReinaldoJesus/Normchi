import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora } from "@/lib/fechas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompraForm } from "../compra-form";

export default async function NuevaCompraPage() {
  const [proveedores, insumos] = await Promise.all([
    prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, leadTimeDias: true },
    }),
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidadCompra: true, proveedorId: true },
    }),
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
