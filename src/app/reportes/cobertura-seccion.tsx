"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ExportarCsvButton } from "@/components/exportar-csv-button";
import type { CoberturaMes } from "@/lib/reportes";

export function CoberturaSeccion({ meses }: { meses: CoberturaMes[] }) {
  const datos = meses.map((m) => ({ ...m, coberturaPct: Math.round(m.cobertura * 1000) / 10 }));
  const filasCsv = meses.map((m) => [m.mes, m.diasOperativos, m.diasRegistrados, m.cobertura]);

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          % de días operativos con ventas cargadas
        </p>
        <ExportarCsvButton
          nombreArchivo="cobertura-registro.csv"
          encabezados={["Mes", "Días operativos", "Días registrados", "Cobertura"]}
          filas={filasCsv}
        />
      </div>
      {datos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin datos todavía.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={70} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${value}% (${(item.payload as CoberturaMes).diasRegistrados}/${(item.payload as CoberturaMes).diasOperativos} días)`,
                  "Cobertura",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="coberturaPct" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {datos.map((d) => (
                  <Cell key={d.mes} fill={d.cobertura < 0.7 ? "#d03b3b" : "#2a78d6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        La línea punteada marca el 70% — bajo ese nivel, el pronóstico degrada su confianza.
      </p>
    </div>
  );
}
