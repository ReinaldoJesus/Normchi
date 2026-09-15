import "server-only";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";

/**
 * Costo teórico vigente de cada producto activo (§6.4), usando el costo
 * medio actual de sus insumos. No depende de precio ni IVA — solo de la BOM.
 */
export async function calcularCostoTeoricoPorProducto(): Promise<Map<number, number>> {
  const [productos, estadoPorInsumo] = await Promise.all([
    prisma.producto.findMany({
      select: {
        id: true,
        recetaLineas: { select: { cantidad: true, insumoId: true, insumo: { select: { mermaPct: true } } } },
      },
    }),
    obtenerEstadoInsumos(),
  ]);

  return new Map(
    productos.map((p) => [
      p.id,
      p.recetaLineas.reduce((acc, l) => {
        const costoMedio = estadoPorInsumo.get(l.insumoId)?.costoMedio ?? 0;
        return acc + Number(l.cantidad) * (1 + Number(l.insumo.mermaPct)) * costoMedio;
      }, 0),
    ])
  );
}
