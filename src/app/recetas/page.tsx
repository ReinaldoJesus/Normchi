import { prisma } from "@/lib/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { obtenerParametros } from "@/lib/parametros";
import { PageHeader } from "@/components/page-header";
import { costearProducto } from "@/lib/motor/recetas";
import { ProductoForm } from "./producto-form";
import { ProductosTable, type FilaProducto } from "./productos-table";

export default async function RecetasPage() {
  const [{ ivaPct: IVA_PCT, preciosIncluyenIva: PRECIOS_INCLUYEN_IVA }, productos, estadoPorInsumo] =
    await Promise.all([
      obtenerParametros(),
      prisma.producto.findMany({
        include: { recetaLineas: { include: { insumo: true } } },
        orderBy: { nombre: "asc" },
      }),
      obtenerEstadoInsumos(),
    ]);

  const filas: FilaProducto[] = productos.map((p) => {
    const tieneReceta = p.recetaLineas.length > 0;
    const costeo = tieneReceta
      ? costearProducto({
          precioVenta: Number(p.precioVenta),
          ivaPct: IVA_PCT,
          preciosIncluyenIva: PRECIOS_INCLUYEN_IVA,
          recetaLineas: p.recetaLineas.map((l) => ({
            productoId: p.id,
            insumoId: l.insumoId,
            cantidad: Number(l.cantidad),
            mermaPct: Number(l.insumo.mermaPct),
          })),
          costoMedioPorInsumo: Object.fromEntries(
            p.recetaLineas.map((l) => [
              l.insumoId,
              estadoPorInsumo.get(l.insumoId)?.costoMedio ?? Number(l.insumo.costoInicial),
            ])
          ),
        })
      : null;

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      precioVenta: Number(p.precioVenta),
      costoTeorico: costeo?.costoTeorico ?? 0,
      margenUnitario: costeo?.margenUnitario ?? 0,
      margenPct: costeo?.margenPct ?? 0,
      foodCostPct: costeo?.foodCostPct ?? 0,
      semaforo: costeo?.semaforo ?? "verde",
      tieneReceta,
      activo: p.activo,
      form: {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        subcategoria: p.subcategoria ?? "",
        precioVenta: p.precioVenta.toString(),
        tiempoPreparacionMin: p.tiempoPreparacionMin.toString(),
        estacion: p.estacion ?? "",
        esReventa: p.esReventa,
      },
    };
  });

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
