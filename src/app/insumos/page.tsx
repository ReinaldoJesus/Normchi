import { listarInsumosConEstado } from "@/lib/services/insumos";
import { listarProveedoresActivos } from "@/lib/services/proveedores";
import { PageHeader } from "@/components/page-header";
import { InsumoForm } from "./insumo-form";
import { InsumosTable } from "./insumos-table";

export default async function InsumosPage() {
  const [filas, proveedores] = await Promise.all([
    listarInsumosConEstado(),
    listarProveedoresActivos(),
  ]);

  const categorias = Array.from(new Set(filas.map((i) => i.categoria))).sort();

  return (
    <div>
      <PageHeader
        title="Insumos"
        description="Materias primas con unidad base, factor de conversión, merma, lead time y proveedor."
        actions={<InsumoForm proveedores={proveedores} />}
      />
      <InsumosTable filas={filas} categorias={categorias} proveedores={proveedores} />
    </div>
  );
}
