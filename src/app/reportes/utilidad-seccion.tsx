"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearPesos } from "@/lib/formato";
import { calcularUtilidadProyectada, type PronosticoProductoMargen } from "@/lib/motor/utilidad";

export function UtilidadSeccion({
  productos,
  horizonteDias,
  costosFijosDiariosDefecto = 0,
}: {
  productos: PronosticoProductoMargen[];
  horizonteDias: number;
  costosFijosDiariosDefecto?: number;
}) {
  const [costosFijosDiarios, setCostosFijosDiarios] = useState(costosFijosDiariosDefecto);

  const resultado = useMemo(
    () => calcularUtilidadProyectada({ productos, horizonteDias, costosFijosDiarios }),
    [productos, horizonteDias, costosFijosDiarios]
  );

  const ventaPromedioDiaria =
    productos.reduce((acc, p) => acc + p.pronosticoPorDia.reduce((a, b) => a + b, 0), 0) /
    Math.max(1, horizonteDias);

  return (
    <div>
      <div className="mb-4 grid max-w-xs gap-1.5">
        <Label>Costos fijos diarios (arriendo, sueldos, servicios)</Label>
        <Input
          type="number"
          min="0"
          step="any"
          value={costosFijosDiarios}
          onChange={(e) => setCostosFijosDiarios(Number(e.target.value) || 0)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile etiqueta={`Margen bruto (${horizonteDias} días)`} valor={formatearPesos(resultado.margenBrutoProyectado)} />
        <Tile
          etiqueta="Utilidad proyectada"
          valor={formatearPesos(resultado.utilidadProyectada)}
          destacado
          negativo={resultado.utilidadProyectada < 0}
        />
        <Tile
          etiqueta="Punto de equilibrio (unidades/día)"
          valor={
            Number.isFinite(resultado.puntoEquilibrioDiarioUnidades)
              ? resultado.puntoEquilibrioDiarioUnidades.toFixed(1)
              : "—"
          }
        />
        <Tile
          etiqueta="Punto de equilibrio (ingresos/día)"
          valor={
            Number.isFinite(resultado.puntoEquilibrioDiarioIngresos)
              ? formatearPesos(resultado.puntoEquilibrioDiarioIngresos)
              : "—"
          }
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Venta promedio proyectada: {ventaPromedioDiaria.toFixed(1)} unidades/día, frente a{" "}
        {Number.isFinite(resultado.puntoEquilibrioDiarioUnidades)
          ? resultado.puntoEquilibrioDiarioUnidades.toFixed(1)
          : "—"}{" "}
        unidades/día de equilibrio.
      </p>
    </div>
  );
}

function Tile({
  etiqueta,
  valor,
  destacado,
  negativo,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  negativo?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{etiqueta}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            destacado
              ? `text-2xl font-semibold ${negativo ? "text-destructive" : ""}`
              : "text-xl"
          }
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}
