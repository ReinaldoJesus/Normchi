import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ProveedorForm } from "./proveedor-form";
import { ProveedoresTable, type FilaProveedor } from "./proveedores-table";

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({ orderBy: { nombre: "asc" } });

  const filas: FilaProveedor[] = proveedores.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    contacto: p.contacto,
    telefono: p.telefono,
    email: p.email,
    leadTimeDias: p.leadTimeDias,
    condicionPago: p.condicionPago,
    activo: p.activo,
    form: {
      id: p.id,
      nombre: p.nombre,
      contacto: p.contacto ?? "",
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      leadTimeDias: p.leadTimeDias,
      condicionPago: p.condicionPago ?? "",
    },
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
        title="Proveedores"
        description="Contacto, condiciones y lead time por defecto."
        actions={<ProveedorForm />}
      />
      <ProveedoresTable filas={filas} />
    </div>
  );
}
