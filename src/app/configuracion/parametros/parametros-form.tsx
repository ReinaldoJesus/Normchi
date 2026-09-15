"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ParametrosApp } from "@/lib/parametros";
import { guardarParametros, type EstadoFormularioParametros } from "@/lib/api/parametros";

const DIAS_SEMANA = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
  { valor: 0, etiqueta: "Domingo" },
];

export function ParametrosForm({ parametros }: { parametros: ParametrosApp }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoFormularioParametros>({ ok: false });
  const [preciosIncluyenIva, setPreciosIncluyenIva] = useState(parametros.preciosIncluyenIva);
  const [diasOperacion, setDiasOperacion] = useState(new Set(parametros.diasOperacionSemana));
  const [enviando, startTransition] = useTransition();
  const [guardadoRecien, setGuardadoRecien] = useState(false);

  function enviar(formData: FormData) {
    setGuardadoRecien(false);
    startTransition(async () => {
      const resultado = await guardarParametros(estado, formData);
      setEstado(resultado);
      if (resultado.ok) {
        setGuardadoRecien(true);
        router.refresh();
        setTimeout(() => setGuardadoRecien(false), 2500);
      }
    });
  }

  const error = (campo: string) => estado.errores?.[campo]?.[0];

  function alternarDia(dia: number) {
    setDiasOperacion((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  }

  return (
    <form action={enviar} className="grid max-w-2xl gap-6">
      {estado.mensajeGeneral ? (
        <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precios e impuestos</CardTitle>
          <CardDescription>Usado en el costeo de recetas y en los reportes de margen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo label="IVA (%)" error={error("ivaPct")}>
            <Input
              name="ivaPctPorcentaje"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={parametros.ivaPct * 100}
              required
            />
          </Campo>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                name="preciosIncluyenIva"
                checked={preciosIncluyenIva}
                onCheckedChange={setPreciosIncluyenIva}
              />
              Los precios de venta incluyen IVA
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planificación</CardTitle>
          <CardDescription>Pronóstico de demanda, MRP y carga de cocina.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Horizonte de planificación (días)"
            error={error("horizontePlanificacionDias")}
          >
            <Input
              name="horizontePlanificacionDias"
              type="number"
              min="1"
              max="60"
              step="1"
              defaultValue={parametros.horizontePlanificacionDias}
              required
            />
          </Campo>
          <Campo label="Ventana histórica para el pronóstico (días)" error={error("ventanaHistorialDias")}>
            <Input
              name="ventanaHistorialDias"
              type="number"
              min="7"
              max="365"
              step="1"
              defaultValue={parametros.ventanaHistorialDias}
              required
            />
          </Campo>
          <Campo label="Alpha de suavizamiento exponencial" error={error("alphaSuavizamiento")}>
            <Input
              name="alphaSuavizamiento"
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              defaultValue={parametros.alphaSuavizamiento}
              required
            />
          </Campo>
          <Campo label="Capacidad de cocina (minutos-persona/día)" error={error("capacidadMinutosDia")}>
            <Input
              name="capacidadMinutosDia"
              type="number"
              min="1"
              step="1"
              defaultValue={parametros.capacidadMinutosDia}
              required
            />
          </Campo>
          <Campo label="Costos fijos diarios ($)" error={error("costosFijosDiarios")}>
            <Input
              name="costosFijosDiarios"
              type="number"
              min="0"
              step="any"
              defaultValue={parametros.costosFijosDiarios}
              required
            />
          </Campo>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Días de operación del restaurante</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {DIAS_SEMANA.map((d) => (
                <label key={d.valor} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="diasOperacionSemana"
                    value={d.valor}
                    checked={diasOperacion.has(d.valor)}
                    onCheckedChange={() => alternarDia(d.valor)}
                  />
                  {d.etiqueta}
                </label>
              ))}
            </div>
            {error("diasOperacionSemana") ? (
              <p className="text-xs text-destructive">{error("diasOperacionSemana")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
        {guardadoRecien ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="h-4 w-4" />
            Guardado
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
