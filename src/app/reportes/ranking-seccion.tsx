"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatearCantidad, formatearPesos } from "@/lib/formato";
import type { DatosMenuProducto } from "@/lib/reportes";

export function RankingSeccion({ datos }: { datos: DatosMenuProducto[] }) {
  const [categoria, setCategoria] = useState<"todas" | "comida" | "bebida">("todas");

  const conMargen = useMemo(
    () =>
      datos
        .filter((d) => categoria === "todas" || d.categoria === categoria)
        .map((d) => {
          const margenUnitario = d.precioPromedioNeto - d.costoTeorico;
          return { ...d, margenUnitario, margenTotal: margenUnitario * d.unidadesVendidas };
        }),
    [datos, categoria]
  );

  const porUnidades = [...conMargen].sort((a, b) => b.unidadesVendidas - a.unidadesVendidas).slice(0, 8);
  const porMargen = [...conMargen].sort((a, b) => b.margenTotal - a.margenTotal).slice(0, 8);

  return (
    <div>
      <div className="mb-4">
        <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            <SelectItem value="comida">Comida</SelectItem>
            <SelectItem value="bebida">Bebida</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <RankingLista
          titulo="Más vendidos (unidades)"
          filas={porUnidades.map((d) => ({
            id: d.productoId,
            nombre: d.nombre,
            valor: `${formatearCantidad(d.unidadesVendidas)} un.`,
          }))}
        />
        <RankingLista
          titulo="Mayor aporte al margen ($)"
          filas={porMargen.map((d) => ({
            id: d.productoId,
            nombre: d.nombre,
            valor: formatearPesos(d.margenTotal),
          }))}
        />
      </div>
    </div>
  );
}

function RankingLista({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { id: number; nombre: string; valor: string }[];
}) {
  return (
    <div className="rounded-xl border">
      <div className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </div>
      {filas.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Sin datos en el período.</p>
      ) : (
        <ol className="divide-y">
          {filas.map((f, i) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate">{f.nombre}</span>
              <span className="tabular-nums font-medium">{f.valor}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
