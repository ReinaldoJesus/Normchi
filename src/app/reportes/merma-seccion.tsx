"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ExportarCsvButton } from "@/components/exportar-csv-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearCantidadLegible, formatearPorcentaje } from "@/lib/formato";
import type { FilaMerma } from "@/lib/reportes";

export function MermaSeccion({ filas }: { filas: FilaMerma[] }) {
  const ordenadas = [...filas].sort((a, b) => a.pctSobreConsumo - b.pctSobreConsumo);
  const datosGrafico = ordenadas
    .filter((f) => f.pctSobreConsumo !== 0)
    .map((f) => ({ nombre: f.nombre, pct: Math.round(f.pctSobreConsumo * 1000) / 10 }));

  const filasCsv = ordenadas.map((f) => [
    f.nombre,
    f.consumoTeorico,
    f.ajusteAcumulado,
    f.pctSobreConsumo,
  ]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ExportarCsvButton
          nombreArchivo="consumo-teorico-vs-ajustes.csv"
          encabezados={["Insumo", "Consumo teórico (unidad base)", "Ajuste acumulado (unidad base)", "% sobre consumo"]}
          filas={filasCsv}
        />
      </div>

      {datosGrafico.length > 0 ? (
        <div className="mb-6 rounded-xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Ajustes acumulados como % del consumo teórico — negativo indica merma no
            contabilizada por receta
          </p>
          <div className="w-full" style={{ height: Math.max(160, datosGrafico.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={datosGrafico}
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={([dataMin, dataMax]) => [Math.min(0, dataMin), Math.max(0, dataMax)]}
                />
                <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, "Ajuste sobre consumo"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="pct" radius={4} maxBarSize={18}>
                  {datosGrafico.map((d) => (
                    <Cell key={d.nombre} fill={d.pct < 0 ? "#d03b3b" : "#0ca30c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Consumo teórico</TableHead>
              <TableHead className="text-right">Ajustes acumulados</TableHead>
              <TableHead className="text-right">% sobre consumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Sin consumo ni ajustes en el período.
                </TableCell>
              </TableRow>
            ) : (
              ordenadas.map((f) => (
                <TableRow key={f.insumoId}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatearCantidadLegible(f.consumoTeorico, f.unidadBase as "g" | "ml" | "un")}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      f.ajusteAcumulado < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {f.ajusteAcumulado > 0 ? "+" : ""}
                    {formatearCantidadLegible(f.ajusteAcumulado, f.unidadBase as "g" | "ml" | "un")}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      f.pctSobreConsumo < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {formatearPorcentaje(f.pctSobreConsumo)}
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
