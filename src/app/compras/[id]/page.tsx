import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fechaLocalAhora, toFechaCalendario } from "@/lib/fechas";
import { formatearPesos } from "@/lib/formato";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnularDialog } from "../anular-dialog";
import { CompraForm } from "../compra-form";
import { EnviarButton } from "../enviar-button";
import { RecepcionForm } from "../recepcion-form";

const ETIQUETA_ESTADO = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  recibida: "Recibida",
  anulada: "Anulada",
} as const;

export default async function CompraDetallePage(
  props: PageProps<"/compras/[id]">
) {
  const { id } = await props.params;
  const compraId = Number(id);
  if (!Number.isInteger(compraId)) notFound();

  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: {
      proveedor: true,
      lineas: { include: { insumo: true } },
    },
  });
  if (!compra) notFound();

  const total = compra.lineas.reduce(
    (acc, l) => acc + Number(l.cantidadCompra) * Number(l.precioUnitarioCompra),
    0
  );

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/compras">
          <ArrowLeft />
          Compras
        </Link>
      </Button>

      <PageHeader
        title={compra.folio}
        description={`${compra.proveedor.nombre} · Emitida ${toFechaCalendario(compra.fechaEmision)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ETIQUETA_ESTADO[compra.estado]}</Badge>
            {compra.estado === "borrador" ? <EnviarButton compraId={compra.id} /> : null}
            {compra.estado !== "anulada" ? <AnularDialog compraId={compra.id} /> : null}
          </div>
        }
      />

      {compra.estado === "anulada" ? (
        <p className="mb-6 text-sm text-muted-foreground">
          Orden anulada{compra.anuladoMotivo ? `: ${compra.anuladoMotivo}` : "."}
        </p>
      ) : null}

      {compra.estado === "borrador" ? (
        <CompraForm
          proveedores={[
            {
              id: compra.proveedor.id,
              nombre: compra.proveedor.nombre,
              leadTimeDias: compra.proveedor.leadTimeDias,
            },
          ]}
          insumos={await prisma.insumo.findMany({
            where: { activo: true },
            orderBy: { nombre: "asc" },
            select: { id: true, nombre: true, unidadCompra: true },
          })}
          fechaHoy={fechaLocalAhora()}
          compraExistente={{
            id: compra.id,
            proveedorId: compra.proveedorId,
            fechaEmision: toFechaCalendario(compra.fechaEmision),
            fechaEsperada: toFechaCalendario(compra.fechaEsperada),
            documento: compra.documento ?? "",
            nota: compra.nota ?? "",
            lineas: compra.lineas.map((l) => ({
              insumoId: l.insumoId,
              cantidadCompra: Number(l.cantidadCompra),
              precioUnitarioCompra: Number(l.precioUnitarioCompra),
            })),
          }}
        />
      ) : compra.estado === "pendiente" ? (
        <RecepcionForm
          compraId={compra.id}
          fechaHoy={fechaLocalAhora()}
          lineas={compra.lineas.map((l) => ({
            compraLineaId: l.id,
            insumoNombre: l.insumo.nombre,
            unidadCompra: l.insumo.unidadCompra,
            cantidadPedida: Number(l.cantidadCompra),
            precioUnitarioCompra: Number(l.precioUnitarioCompra),
          }))}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                {compra.estado === "recibida" ? (
                  <TableHead className="text-right">Recibido</TableHead>
                ) : null}
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compra.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.insumo.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {l.cantidadCompra.toString()} {l.insumo.unidadCompra}
                  </TableCell>
                  {compra.estado === "recibida" ? (
                    <TableCell className="text-right tabular-nums">
                      {l.cantidadRecibidaCompra?.toString() ?? "—"} {l.insumo.unidadCompra}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(Number(l.precioUnitarioCompra))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(
                      Number(l.cantidadRecibidaCompra ?? l.cantidadCompra) *
                        Number(l.precioUnitarioCompra)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {compra.estado !== "borrador" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Total: <span className="font-medium tabular-nums">{formatearPesos(total)}</span>
        </p>
      ) : null}
    </div>
  );
}
