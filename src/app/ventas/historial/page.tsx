import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { toFechaCalendario, fechaLocalAhora } from "@/lib/fechas";
import { calcularCostoTeoricoPorProducto } from "@/lib/costeoActual";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearPesos } from "@/lib/formato";
import { CalendarioRegistro } from "./calendario-registro";

const ETIQUETA_CANAL = { salon: "Salón", delivery: "Delivery", retiro: "Retiro" } as const;

export default async function HistorialVentasPage(
  props: PageProps<"/ventas/historial">
) {
  const searchParams = await props.searchParams;
  const hoy = fechaLocalAhora();
  const mes = typeof searchParams.mes === "string" ? searchParams.mes : hoy.slice(0, 7);

  const inicioMes = new Date(`${mes}-01T00:00:00Z`);
  const finMes = new Date(inicioMes);
  finMes.setUTCMonth(finMes.getUTCMonth() + 1);

  const [ventas, diasCierre, costoTeoricoPorProducto] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: inicioMes, lt: finMes } },
      include: { lineas: { include: { producto: { select: { categoria: true } } } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.diaCierre.findMany({
      where: { fecha: { gte: inicioMes, lt: finMes } },
    }),
    calcularCostoTeoricoPorProducto(),
  ]);

  const filas = ventas.map((v) => {
    let unidadesComida = 0;
    let unidadesBebida = 0;
    let ingreso = 0;
    let margen = 0;
    for (const l of v.lineas) {
      const cantidad = Number(l.cantidad);
      const ingresoLinea = cantidad * Number(l.precioUnitario);
      const costoLinea = cantidad * (costoTeoricoPorProducto.get(l.productoId) ?? 0);
      ingreso += ingresoLinea;
      margen += ingresoLinea - costoLinea;
      if (l.producto.categoria === "bebida") unidadesBebida += cantidad;
      else unidadesComida += cantidad;
    }
    return {
      id: v.id,
      fecha: toFechaCalendario(v.fecha),
      canal: v.canal,
      unidadesComida,
      unidadesBebida,
      ingreso,
      margen,
    };
  });

  const fechasRegistradas = new Set(ventas.map((v) => toFechaCalendario(v.fecha)));
  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/ventas">
          <ArrowLeft />
          Ventas
        </Link>
      </Button>
      <PageHeader
        title="Historial de ventas"
        description="Días registrados, márgenes y cobertura de registro del mes."
      />

      <CalendarioRegistro
        mes={mes}
        hoy={hoy}
        fechasRegistradas={fechasRegistradas}
        fechasCierre={fechasCierre}
      />

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Unid. comida</TableHead>
              <TableHead className="text-right">Unid. bebida</TableHead>
              <TableHead className="text-right">Ingreso</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay ventas registradas este mes.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.fecha}</TableCell>
                  <TableCell>{ETIQUETA_CANAL[f.canal]}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.unidadesComida}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.unidadesBebida}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.ingreso)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.margen)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                      <Link href={`/ventas?fecha=${f.fecha}&canal=${f.canal}`}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
