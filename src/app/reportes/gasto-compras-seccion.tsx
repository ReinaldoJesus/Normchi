"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ExportarCsvButton } from "@/components/exportar-csv-button";
import { formatearPesos, formatearPesosCompacto } from "@/lib/formato";
import type { FilaGastoCompras } from "@/lib/reportes";

export function GastoComprasSeccion({ filas }: { filas: FilaGastoCompras[] }) {
  const porMes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const f of filas) mapa.set(f.mes, (mapa.get(f.mes) ?? 0) + f.total);
    return Array.from(mapa.entries())
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filas]);

  const porProveedor = useMemo(() => agrupar(filas, (f) => f.proveedor), [filas]);
  const porCategoria = useMemo(() => agrupar(filas, (f) => f.categoriaInsumo), [filas]);

  const filasCsv = filas.map((f) => [f.mes, f.proveedor, f.categoriaInsumo, f.total]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ExportarCsvButton
          nombreArchivo="gasto-compras.csv"
          encabezados={["Mes", "Proveedor", "Categoría insumo", "Total"]}
          filas={filasCsv}
        />
      </div>

      <div className="mb-6 rounded-xl border p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Gasto en compras por mes</p>
        {porMes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin compras recibidas todavía.</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => formatearPesosCompacto(v)} />
                <Tooltip
                  formatter={(value) => [formatearPesos(Number(value)), "Gasto"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ListaTotales titulo="Por proveedor" filas={porProveedor} />
        <ListaTotales titulo="Por categoría de insumo" filas={porCategoria} />
      </div>
    </div>
  );
}

function agrupar(
  filas: FilaGastoCompras[],
  clave: (f: FilaGastoCompras) => string
): { nombre: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    const k = clave(f);
    mapa.set(k, (mapa.get(k) ?? 0) + f.total);
  }
  return Array.from(mapa.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

function ListaTotales({ titulo, filas }: { titulo: string; filas: { nombre: string; total: number }[] }) {
  return (
    <div className="rounded-xl border">
      <div className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </div>
      {filas.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="divide-y">
          {filas.map((f) => (
            <li key={f.nombre} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="truncate">{f.nombre}</span>
              <span className="tabular-nums font-medium">{formatearPesos(f.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
