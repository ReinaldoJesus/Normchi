import { listarProductosConCosteo } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { ProductoForm } from "./producto-form";
import { ProductosTable } from "./productos-table";

export default async function RecetasPage() {
  const filas = await listarProductosConCosteo();

  return (
    <div>
      <PageHeader
        title="Recetas"
        description="Productos vendibles y su BOM. El costo teórico y el margen se calculan a partir de la receta."
        actions={<ProductoForm />}
      />
      <ProductosTable filas={filas} />
    </div>
  );
}
