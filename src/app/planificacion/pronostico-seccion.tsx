"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearCantidad, formatearPorcentaje } from "@/lib/formato";
import type { NivelConfianza, PuntoPronostico } from "@/lib/motor/pronostico";
import { crearOverride } from "./actions";

export interface FilaPronostico {
  productoId: number;
  nombre: string;
  categoria: "comida" | "bebida";
  diasConDatos: number;
  coberturaRegistro: number;
  wape?: number;
  confianza: NivelConfianza;
  pronosticoTotal: number;
  puntos: PuntoPronostico[];
}

export interface PuntoSerieAgregada {
  fecha: string;
  real?: number;
  proyectado?: number;
}

const ESTILO_CONFIANZA: Record<NivelConfianza, string> = {
  alta: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  media: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  baja: "bg-destructive/10 text-destructive",
  sin_datos: "bg-muted text-muted-foreground",
};

const ETIQUETA_CONFIANZA: Record<NivelConfianza, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  sin_datos: "Sin datos",
};

const AZUL_PRINCIPAL = "var(--color-primary)";

export function PronosticoSeccion({
  filas,
  serieAgregada,
  hoy,
}: {
  filas: FilaPronostico[];
  serieAgregada: PuntoSerieAgregada[];
  hoy: string;
}) {
  const coberturaBaja = filas.some((f) => f.coberturaRegistro < 0.7 && f.diasConDatos > 0);

  return (
    <div>
      <div className="mb-4 rounded-xl border p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Unidades totales por día — histórico y proyección
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
            <LineChart data={serieAgregada} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="fecha"
                tickFormatter={(f: string) => f.slice(5)}
                tick={{ fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
              <Tooltip
                labelFormatter={(f) => String(f)}
                formatter={(value, name) => [
                  formatearCantidad(Number(value)),
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

      {coberturaBaja ? (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
          Algunos productos tienen menos del 70% de cobertura de registro — el
          pronóstico de esos productos usa un promedio simple y su confianza
          queda marcada como baja.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Pronóstico horizonte</TableHead>
              <TableHead className="text-right">Cobertura de registro</TableHead>
              <TableHead className="text-right">WAPE</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay productos activos.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f) => (
                <TableRow key={f.productoId}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {f.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearCantidad(f.pronosticoTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {f.diasConDatos > 0 ? formatearPorcentaje(f.coberturaRegistro) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {f.wape !== undefined ? formatearPorcentaje(f.wape) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTILO_CONFIANZA[f.confianza]} variant="outline">
                      {ETIQUETA_CONFIANZA[f.confianza]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AjusteManualDialog fila={f} />
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

function AjusteManualDialog({ fila }: { fila: FilaPronostico }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(fila.puntos[0]?.fecha ?? "");
  const [cantidad, setCantidad] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const overridesExistentes = useMemo(
    () => fila.puntos.filter((p) => p.esOverride),
    [fila.puntos]
  );

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await crearOverride({
        productoId: fila.productoId,
        fecha,
        cantidad,
        motivo,
      });
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo guardar el ajuste.");
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar pronóstico — {fila.nombre}</DialogTitle>
          <DialogDescription>
            Un ajuste manual tiene precedencia absoluta sobre el modelo para esa fecha.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Motivo</Label>
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="ej. Evento, feriado, promoción"
          />
        </div>
        {overridesExistentes.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Ya hay {overridesExistentes.length} ajuste(s) vigente(s) en el horizonte actual.
          </p>
        ) : null}
        <DialogFooter>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
