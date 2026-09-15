"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatearPesos, formatearPesosCompacto } from "@/lib/formato";
import type { PuntoSerieVentas } from "@/lib/dashboard";

const AZUL_PRINCIPAL = "var(--color-primary)";

export function VentasChart({ serie, hoy }: { serie: PuntoSerieVentas[]; hoy: string }) {
  if (serie.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border text-sm text-muted-foreground">
        Sin datos suficientes para mostrar la tendencia.
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Ventas netas por día — histórico y proyección
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="mr-3">
            <span className="mr-1 inline-block h-0.5 w-3 align-middle bg-primary" />
            Real
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 border-t-2 border-dashed border-primary align-middle" />
            Proyectado
          </span>
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="fecha"
              tickFormatter={(f: string) => f.slice(5)}
              tick={{ fontSize: 11 }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={52}
              tickFormatter={(v) => formatearPesosCompacto(v)}
            />
            <Tooltip
              labelFormatter={(f) => String(f)}
              formatter={(value, name) => [
                formatearPesos(Number(value)),
                name === "real" ? "Real" : "Proyectado",
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine x={hoy} stroke="var(--color-muted-foreground)" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="real"
              stroke={AZUL_PRINCIPAL}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="proyectado"
              stroke={AZUL_PRINCIPAL}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
