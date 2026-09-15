import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora, toFechaCalendario } from "@/lib/fechas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ComprasTable, type FilaCompra } from "./compras-table";

export default async function ComprasPage() {
  const compras = await prisma.compra.findMany({
    include: { proveedor: { select: { nombre: true } }, lineas: true },
    orderBy: { fechaEmision: "desc" },
  });

  const hoy = fechaLocalAhora();

  const filas: FilaCompra[] = compras.map((c) => ({
    id: c.id,
    folio: c.folio,
    proveedorNombre: c.proveedor.nombre,
    fechaEmision: toFechaCalendario(c.fechaEmision),
    fechaEsperada: toFechaCalendario(c.fechaEsperada),
    estado: c.estado,
    total: c.lineas.reduce(
      (acc, l) => acc + Number(l.cantidadCompra) * Number(l.precioUnitarioCompra),
      0
    ),
    vencida: c.estado === "pendiente" && toFechaCalendario(c.fechaEsperada) < hoy,
  }));

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
