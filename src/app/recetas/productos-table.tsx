"use client";

import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";

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
import { formatearPesos, formatearPorcentaje } from "@/lib/formato";
import type { SemaforoFoodCost } from "@/lib/motor/recetas";
import { cambiarEstadoProducto } from "./actions";
import { ProductoForm, type ProductoParaEditar } from "./producto-form";

export interface FilaProducto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  precioVenta: number;
  costoTeorico: number;
  margenUnitario: number;
  margenPct: number;
  foodCostPct: number;
  semaforo: SemaforoFoodCost;
  tieneReceta: boolean;
  activo: boolean;
  form: ProductoParaEditar;
}

const COLOR_SEMAFORO: Record<SemaforoFoodCost, string> = {
  verde: "bg-emerald-500",
  ambar: "bg-amber-500",
  rojo: "bg-red-500",
};

export function ProductosTable({ filas }: { filas: FilaProducto[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio de venta</TableHead>
            <TableHead className="text-right">Costo teórico</TableHead>
            <TableHead className="text-right">Margen</TableHead>
            <TableHead className="text-right">Food cost</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Aún no hay productos.
              </TableCell>
            </TableRow>
          ) : (
            filas.map((f) => (
              <TableRow key={f.id} className={f.activo ? "" : "opacity-50"}>
                <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/recetas/${f.id}`} className="hover:underline">
                    {f.nombre}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {f.categoria}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearPesos(f.precioVenta)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {f.tieneReceta ? formatearPesos(f.costoTeorico) : "sin receta"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {f.tieneReceta ? formatearPesos(f.margenUnitario) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {f.tieneReceta ? (
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${COLOR_SEMAFORO[f.semaforo]}`} />
                      <span className="tabular-nums">{formatearPorcentaje(f.foodCostPct)}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ProductoForm
                      producto={f.form}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-7">
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <Link href={`/recetas/${f.id}`}>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                    <form action={cambiarEstadoProducto.bind(null, f.id, !f.activo)}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" type="submit">
                        {f.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
