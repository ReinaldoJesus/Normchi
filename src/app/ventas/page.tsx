import Link from "next/link";
import { History, Upload } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora } from "@/lib/fechas";
import { calcularCostoTeoricoPorProducto } from "@/lib/costeoActual";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CierreDia, type ProductoCierre } from "./cierre-dia";
import type { CanalVenta } from "@/generated/prisma";

const CANALES: CanalVenta[] = ["salon", "delivery", "retiro"];

export default async function VentasPage(props: PageProps<"/ventas">) {
  const searchParams = await props.searchParams;
  const fecha =
    typeof searchParams.fecha === "string" ? searchParams.fecha : fechaLocalAhora();
  const canalParam = typeof searchParams.canal === "string" ? searchParams.canal : "salon";
  const canal: CanalVenta = CANALES.includes(canalParam as CanalVenta)
    ? (canalParam as CanalVenta)
    : "salon";

  const fechaDate = new Date(`${fecha}T00:00:00Z`);

  const [productos, costoTeoricoPorProducto, ventaExistente, diaCierre] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    calcularCostoTeoricoPorProducto(),
    prisma.venta.findFirst({
      where: { fecha: fechaDate, canal },
      include: { lineas: true },
    }),
    prisma.diaCierre.findUnique({ where: { fecha: fechaDate } }),
  ]);

  const cantidadPorProducto = new Map(
    ventaExistente?.lineas.map((l) => [l.productoId, Number(l.cantidad)]) ?? []
  );
  const precioPorProducto = new Map(
    ventaExistente?.lineas.map((l) => [l.productoId, Number(l.precioUnitario)]) ?? []
  );

  const productosCierre: ProductoCierre[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precioVenta: precioPorProducto.get(p.id) ?? Number(p.precioVenta),
    costoTeorico: costoTeoricoPorProducto.get(p.id) ?? 0,
    cantidadInicial: cantidadPorProducto.get(p.id) ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Cierre de día — carga el día completo en menos de 2 minutos, solo con teclado."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ventas/importar">
                <Upload />
                Importar CSV
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ventas/historial">
                <History />
                Historial
              </Link>
            </Button>
          </div>
        }
      />

      <CierreDia
        fecha={fecha}
        canal={canal}
        dow={fechaDate.getUTCDay()}
        productos={productosCierre}
        diaCerrado={
          diaCierre ? { motivo: diaCierre.motivo } : null
        }
        yaRegistrado={Boolean(ventaExistente)}
      />
    </div>
  );
}
