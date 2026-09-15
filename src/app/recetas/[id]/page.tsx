import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { obtenerParametros } from "@/lib/parametros";
import { Button } from "@/components/ui/button";
import { RecetaEditor } from "./receta-editor";

export default async function RecetaPage(props: PageProps<"/recetas/[id]">) {
  const { id } = await props.params;
  const productoId = Number(id);
  if (!Number.isInteger(productoId)) notFound();

  const [{ ivaPct: IVA_PCT, preciosIncluyenIva: PRECIOS_INCLUYEN_IVA }, producto, insumos, estadoPorInsumo] =
    await Promise.all([
      obtenerParametros(),
      prisma.producto.findUnique({
        where: { id: productoId },
        include: { recetaLineas: true },
      }),
      prisma.insumo.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      }),
      obtenerEstadoInsumos(),
    ]);

  if (!producto) notFound();

  const insumosParaEditor = insumos.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    unidadBase: i.unidadBase,
    mermaPct: Number(i.mermaPct),
    costoMedio: estadoPorInsumo.get(i.id)?.costoMedio ?? Number(i.costoInicial),
  }));

  const lineasIniciales = producto.recetaLineas.map((l) => ({
    insumoId: l.insumoId,
    cantidad: Number(l.cantidad),
  }));

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/recetas">
          <ArrowLeft />
          Recetas
        </Link>
      </Button>

      <RecetaEditor
        producto={{
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precioVenta: Number(producto.precioVenta),
          tiempoPreparacionMin: Number(producto.tiempoPreparacionMin),
          esReventa: producto.esReventa,
        }}
        insumos={insumosParaEditor}
        lineasIniciales={lineasIniciales}
        ivaPct={IVA_PCT}
        preciosIncluyenIva={PRECIOS_INCLUYEN_IVA}
      />
    </div>
  );
}
