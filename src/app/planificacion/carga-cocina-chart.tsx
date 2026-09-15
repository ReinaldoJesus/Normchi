"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CargaDia } from "@/lib/motor/cocina";

// Paleta de estado validada para uso en gráficos (dataviz skill): distinta de
// la escala categórica, para que un color de estado nunca se confunda con una serie.
const COLOR_ESTADO: Record<CargaDia["estado"], string> = {
  normal: "#0ca30c",
  ambar: "#fab219",
  rojo: "#d03b3b",
};

const ETIQUETA_ESTADO: Record<CargaDia["estado"], string> = {
  normal: "Normal",
  ambar: "Ámbar (> 85%)",
  rojo: "Sobre capacidad",
};

export function CargaCocinaSeccion({
  dias,
  capacidadMinutosDia,
}: {
  dias: CargaDia[];
  capacidadMinutosDia: number;
}) {
  if (dias.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Sin demanda pronosticada en el horizonte.
      </div>
    );
  }

  const data = dias.map((d) => ({
    fecha: d.fecha,
    utilizacionPct: Math.round(d.utilizacion * 1000) / 10,
    estado: d.estado,
    cargaMinutos: Math.round(d.cargaMinutos),
  }));

  return (
    <div className="rounded-xl border p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Utilización de la capacidad de cocina ({capacidadMinutosDia} min-persona/día)
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="fecha"
              tickFormatter={(f: string) => f.slice(5)}
              tick={{ fontSize: 11 }}
              minTickGap={16}
            />
            <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              labelFormatter={(f) => String(f)}
              formatter={(value, _name, item) => [
                `${value}% · ${(item.payload as { cargaMinutos: number }).cargaMinutos} min`,
                "Utilización",
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine
              y={100}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 4"
            />
            <Bar dataKey="utilizacionPct" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((d) => (
                <Cell key={d.fecha} fill={COLOR_ESTADO[d.estado]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(Object.keys(COLOR_ESTADO) as CargaDia["estado"][]).map((estado) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_ESTADO[estado] }}
            />
            {ETIQUETA_ESTADO[estado]}
          </span>
        ))}
      </div>
    </div>
  );
}
