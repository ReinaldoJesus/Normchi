"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportarCsvButton } from "@/components/exportar-csv-button";
import { formatearCantidad, formatearPesos, formatearPorcentaje } from "@/lib/formato";
import { clasificarMenu, type CuadranteMenu, type ResultadoMenuProducto } from "@/lib/motor/menuEngineering";
import type { DatosMenuProducto } from "@/lib/reportes";

const COLOR_CUADRANTE: Record<CuadranteMenu, string> = {
  estrella: "#2a78d6",
  caballo_de_batalla: "#eb6834",
  rompecabezas: "#1baf7a",
  perro: "#9c9c94",
};

const ETIQUETA_CUADRANTE: Record<CuadranteMenu, string> = {
  estrella: "Estrella",
  caballo_de_batalla: "Caballo de batalla",
  rompecabezas: "Rompecabezas",
  perro: "Perro",
};

const ACCION_CUADRANTE: Record<CuadranteMenu, string> = {
  estrella: "Mantener receta y calidad. No bajar el precio.",
  caballo_de_batalla: "Revisar costo de insumos o subir precio con cuidado.",
  rompecabezas: "Promover, reubicar en la carta.",
  perro: "Candidato a salir de la carta.",
};

function calcularUmbrales(datos: { unidadesVendidas: number; margen: number }[]) {
  const n = datos.length;
  const totalUnidades = datos.reduce((a, d) => a + d.unidadesVendidas, 0);
  const umbralPopularidad = n > 0 ? (1 / n) * 0.7 : 0;
  const umbralMargen =
    totalUnidades > 0
      ? datos.reduce((a, d) => a + d.margen * d.unidadesVendidas, 0) / totalUnidades
      : 0;
  return { umbralPopularidad, umbralMargen };
}

export function MenuEngineeringSeccion({ datos }: { datos: DatosMenuProducto[] }) {
  const [categoria, setCategoria] = useState<"todas" | "comida" | "bebida">("todas");
  const [segmentado, setSegmentado] = useState(true);

  const mapear = (d: DatosMenuProducto) => ({
    productoId: d.productoId,
    unidadesVendidas: d.unidadesVendidas,
    precioPromedioNeto: d.precioPromedioNeto,
    costoTeorico: d.costoTeorico,
  });

  const resultado = useMemo<ResultadoMenuProducto[]>(() => {
    if (categoria === "todas" && segmentado) {
      return [
        ...clasificarMenu(datos.filter((d) => d.categoria === "comida").map(mapear)),
        ...clasificarMenu(datos.filter((d) => d.categoria === "bebida").map(mapear)),
      ];
    }
    const filtrados = categoria === "todas" ? datos : datos.filter((d) => d.categoria === categoria);
    return clasificarMenu(filtrados.map(mapear));
  }, [datos, categoria, segmentado]);

  const porId = useMemo(() => new Map(datos.map((d) => [d.productoId, d])), [datos]);

  const umbrales = useMemo(() => {
    if (categoria === "todas" && segmentado) {
      // Con umbrales segmentados no hay una única línea de referencia global;
      // se omiten las líneas de referencia en el gráfico en ese caso.
      return null;
    }
    return calcularUmbrales(
      resultado.map((r) => ({
        unidadesVendidas: porId.get(r.productoId)?.unidadesVendidas ?? 0,
        margen: r.margenContribucion,
      }))
    );
  }, [resultado, porId, categoria, segmentado]);

  const puntos = resultado.map((r) => ({
    ...r,
    nombre: porId.get(r.productoId)?.nombre ?? "",
    popularidadPct: r.popularidad * 100,
  }));

  const filasCsv = resultado
    .map((r) => {
      const d = porId.get(r.productoId);
      return [
        d?.codigo ?? "",
        d?.nombre ?? "",
        d?.categoria ?? "",
        r.popularidad,
        r.margenContribucion,
        r.margenTotalAportado,
        ETIQUETA_CUADRANTE[r.cuadrante],
      ];
    })
    .sort((a, b) => Number(b[5]) - Number(a[5]));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
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
        {categoria === "todas" ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={segmentado} onCheckedChange={(v) => setSegmentado(v === true)} />
            Calcular umbrales dentro de cada categoría
          </label>
        ) : null}
        <div className="ml-auto">
          <ExportarCsvButton
            nombreArchivo="menu-engineering.csv"
            encabezados={["Código", "Nombre", "Categoría", "Popularidad", "Margen unitario", "Margen total", "Cuadrante"]}
            filas={filasCsv}
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border p-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                dataKey="popularidadPct"
                name="Popularidad"
                unit="%"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="margenContribucion"
                name="Margen unitario"
                tick={{ fontSize: 11 }}
                width={48}
                tickFormatter={(v: number) => formatearCantidad(v)}
              />
              <ZAxis type="number" dataKey="margenTotalAportado" range={[60, 400]} />
              {umbrales ? (
                <>
                  <ReferenceLine
                    x={umbrales.umbralPopularidad * 100}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    y={umbrales.umbralMargen}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 4"
                  />
                </>
              ) : null}
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload as (typeof puntos)[number];
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-xs shadow-sm">
                      <p className="mb-1 font-medium">{p.nombre}</p>
                      <p>Popularidad: {formatearPorcentaje(p.popularidad)}</p>
                      <p>Margen unitario: {formatearPesos(p.margenContribucion)}</p>
                      <p>Aporte total: {formatearPesos(p.margenTotalAportado)}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={puntos}>
                {puntos.map((p) => (
                  <Cell key={p.productoId} fill={COLOR_CUADRANTE[p.cuadrante]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(Object.keys(COLOR_CUADRANTE) as CuadranteMenu[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_CUADRANTE[c] }} />
              {ETIQUETA_CUADRANTE[c]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Popularidad</TableHead>
              <TableHead className="text-right">Margen unitario</TableHead>
              <TableHead className="text-right">Aporte total</TableHead>
              <TableHead>Cuadrante</TableHead>
              <TableHead>Acción sugerida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {puntos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Sin ventas en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              [...puntos]
                .sort((a, b) => b.margenTotalAportado - a.margenTotalAportado)
                .map((p) => (
                  <TableRow key={p.productoId}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearPorcentaje(p.popularidad)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearPesos(p.margenContribucion)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearPesos(p.margenTotalAportado)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{ borderColor: COLOR_CUADRANTE[p.cuadrante] }}
                      >
                        {ETIQUETA_CUADRANTE[p.cuadrante]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ACCION_CUADRANTE[p.cuadrante]}
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
