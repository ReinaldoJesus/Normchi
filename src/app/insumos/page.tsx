import { prisma } from "@/lib/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { PageHeader } from "@/components/page-header";
import { InsumoForm } from "./insumo-form";
import { InsumosTable, type EstadoInsumo, type FilaInsumo } from "./insumos-table";

function calcularEstado(stockActual: number, stockSeguridad: number): EstadoInsumo {
  if (stockActual < 0) return "negro";
  if (stockActual < stockSeguridad) return "ambar";
  return "verde";
}

export default async function InsumosPage() {
  const [insumos, proveedores, estadoPorInsumo] = await Promise.all([
    prisma.insumo.findMany({
      include: {
        proveedor: { select: { id: true, nombre: true } },
        _count: { select: { movimientosInventario: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.proveedor.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    obtenerEstadoInsumos(),
  ]);

  const filas: FilaInsumo[] = insumos.map((i) => {
    const estado = estadoPorInsumo.get(i.id);
    const stockActual = estado?.stock ?? Number(i.stockInicial);
    const stockSeguridad = Number(i.stockSeguridad);
    const costoMedio = estado?.costoMedio ?? Number(i.costoInicial);

    return {
      id: i.id,
      codigo: i.codigo,
      nombre: i.nombre,
      categoria: i.categoria,
      unidadBase: i.unidadBase,
      unidadCompra: i.unidadCompra,
      stockActual,
      stockSeguridad,
      costoMedio,
      valorBodega: stockActual * costoMedio,
      proveedorId: i.proveedorId,
      proveedorNombre: i.proveedor?.nombre ?? null,
      estado: calcularEstado(stockActual, stockSeguridad),
      activo: i.activo,
      form: {
        id: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        categoria: i.categoria,
        unidadBase: i.unidadBase,
        unidadCompra: i.unidadCompra,
        factorConversion: i.factorConversion.toString(),
        mermaPct: i.mermaPct.toString(),
        stockSeguridad: i.stockSeguridad.toString(),
        loteMinimoCompra: i.loteMinimoCompra.toString(),
        leadTimeDias: i.leadTimeDias,
        proveedorId: i.proveedorId,
        perecible: i.perecible,
        stockInicial: i.stockInicial.toString(),
        costoInicial: i.costoInicial.toString(),
        tieneMovimientos: i._count.movimientosInventario > 0,
      },
    };
  });

  const categorias = Array.from(new Set(insumos.map((i) => i.categoria))).sort();

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
