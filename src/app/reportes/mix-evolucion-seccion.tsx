"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExportarCsvButton } from "@/components/exportar-csv-button";
import { formatearPesos, formatearPesosCompacto } from "@/lib/formato";
import type { SemanaMix } from "@/lib/reportes";

const COLOR_COMIDA = "#2a78d6";
const COLOR_BEBIDA = "#eb6834";

export function MixEvolucionSeccion({ semanas }: { semanas: SemanaMix[] }) {
  const datosMix = semanas.map((s) => {
    const total = s.comida.ingreso + s.bebida.ingreso;
    return {
      semana: s.semanaInicio,
      comidaPct: total > 0 ? (s.comida.ingreso / total) * 100 : 0,
      bebidaPct: total > 0 ? (s.bebida.ingreso / total) * 100 : 0,
    };
  });

  const datosMargen = semanas.map((s) => ({
    semana: s.semanaInicio,
    comida: s.comida.margen,
    bebida: s.bebida.margen,
  }));

  const filasCsv = semanas.map((s) => [
    s.semanaInicio,
    s.comida.unidades,
    s.comida.ingreso,
    s.comida.margen,
    s.bebida.unidades,
    s.bebida.ingreso,
    s.bebida.margen,
  ]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ExportarCsvButton
          nombreArchivo="mix-comida-bebida.csv"
          encabezados={[
            "Semana",
            "Unidades comida",
            "Ingreso comida",
            "Margen comida",
            "Unidades bebida",
            "Ingreso bebida",
            "Margen bebida",
          ]}
          filas={filasCsv}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Mix de ingreso por categoría
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosMix} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="semana" tickFormatter={(f: string) => f.slice(5)} tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(f) => String(f)}
                  formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name === "comidaPct" ? "Comida" : "Bebida"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="comidaPct" stackId="mix" stroke={COLOR_COMIDA} fill={COLOR_COMIDA} fillOpacity={0.35} />
                <Area type="monotone" dataKey="bebidaPct" stackId="mix" stroke={COLOR_BEBIDA} fill={COLOR_BEBIDA} fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Leyenda />
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Margen por categoría
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosMargen} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="semana" tickFormatter={(f: string) => f.slice(5)} tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => formatearPesosCompacto(v)} />
                <Tooltip
                  labelFormatter={(f) => String(f)}
                  formatter={(value, name) => [formatearPesos(Number(value)), name === "comida" ? "Comida" : "Bebida"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line type="monotone" dataKey="comida" stroke={COLOR_COMIDA} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bebida" stroke={COLOR_BEBIDA} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Leyenda />
        </div>
      </div>
    </div>
  );
}

function Leyenda() {
  return (
    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_COMIDA }} />
        Comida
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_BEBIDA }} />
        Bebida
      </span>
    </div>
  );
}
