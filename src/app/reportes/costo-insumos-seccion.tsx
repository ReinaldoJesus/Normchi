"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Checkbox } from "@/components/ui/checkbox";
import { ExportarCsvButton } from "@/components/exportar-csv-button";
import { formatearCostoUnitarioLegible, formatearPorcentaje } from "@/lib/formato";
import type { SerieCostoInsumo } from "@/lib/reportes";

// Orden categórico fijo (validado por el skill de dataviz para líneas adyacentes).
const COLORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

export function CostoInsumosSeccion({ series }: { series: SerieCostoInsumo[] }) {
  const disponibles = useMemo(
    () => series.filter((s) => s.puntos.some((p) => p.costoMedio > 0)),
    [series]
  );
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(disponibles.slice(0, 5).map((s) => s.insumoId))
  );

  const seriesVisibles = disponibles.filter((s) => seleccionados.has(s.insumoId));

  const datosGrafico = useMemo(() => {
    const fechas = disponibles[0]?.puntos.map((p) => p.fecha) ?? [];
    return fechas.map((fecha, idx) => {
      const fila: Record<string, string | number> = { fecha };
      for (const s of seriesVisibles) {
        const base = s.puntos[0]?.costoMedio || 1;
        fila[`i${s.insumoId}`] = Math.round((s.puntos[idx].costoMedio / base) * 1000) / 10;
      }
      return fila;
    });
  }, [disponibles, seriesVisibles]);

  const filasCsv = disponibles.flatMap((s) =>
    s.puntos.map((p) => [s.nombre, p.fecha, p.costoMedio])
  );

  function alternar(insumoId: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(insumoId)) next.delete(insumoId);
      else next.add(insumoId);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ExportarCsvButton
          nombreArchivo="evolucion-costo-insumos.csv"
          encabezados={["Insumo", "Fecha", "Costo medio ($/unidad base)"]}
          filas={filasCsv}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Costo medio indexado (inicio del período = 100)
          </p>
          {datosGrafico.length === 0 || seriesVisibles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecciona al menos un insumo con movimientos.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosGrafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(f: string) => f.slice(5)}
                    tick={{ fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    labelFormatter={(f) => String(f)}
                    formatter={(value, name) => {
                      const s = seriesVisibles.find((x) => `i${x.insumoId}` === name);
                      return [`${value}`, s?.nombre ?? String(name)];
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  {seriesVisibles.map((s, i) => (
                    <Line
                      key={s.insumoId}
                      type="stepAfter"
                      dataKey={`i${s.insumoId}`}
                      stroke={COLORES[i % COLORES.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border p-3">
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Insumos</p>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {disponibles.map((s) => {
              const idx = seriesVisibles.findIndex((x) => x.insumoId === s.insumoId);
              const primero = s.puntos[0]?.costoMedio ?? 0;
              const ultimo = s.puntos[s.puntos.length - 1]?.costoMedio ?? 0;
              const variacion = primero > 0 ? (ultimo - primero) / primero : 0;
              return (
                <label
                  key={s.insumoId}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50"
                >
                  <Checkbox
                    checked={seleccionados.has(s.insumoId)}
                    onCheckedChange={() => alternar(s.insumoId)}
                  />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: idx >= 0 ? COLORES[idx % COLORES.length] : "transparent" }}
                  />
                  <span className="flex-1 truncate">{s.nombre}</span>
                  <span
                    className={
                      variacion > 0
                        ? "text-destructive"
                        : variacion < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    {variacion === 0 ? "—" : formatearPorcentaje(variacion)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      {seriesVisibles.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Costo medio actual:{" "}
          {seriesVisibles
            .map(
              (s) =>
                `${s.nombre} ${formatearCostoUnitarioLegible(
                  s.puntos[s.puntos.length - 1]?.costoMedio ?? 0,
                  s.unidadBase as "g" | "ml" | "un"
                )}`
            )
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
