"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearCantidad, formatearPesos } from "@/lib/formato";
import { generarOrdenDesdeSugerencia } from "@/lib/api/planificacion";

export interface LineaMrp {
  insumoId: number;
  insumoNombre: string;
  unidadCompra: string;
  stockActual: number;
  coberturaDias: number;
  fechaQuiebre: string | null;
  fechaPedido: string | null;
  urgente: boolean;
  cantidadSugerida: number;
  costoMedio: number;
  factorConversion: number;
  costoEstimado: number;
}

export interface GrupoProveedorMrp {
  proveedorId: number | null;
  proveedorNombre: string;
  lineas: LineaMrp[];
}

export function MrpSeccion({ grupos }: { grupos: GrupoProveedorMrp[] }) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Ningún insumo necesita compra dentro del horizonte seleccionado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.map((g) => (
        <GrupoProveedor key={g.proveedorId ?? "sin_proveedor"} grupo={g} />
      ))}
    </div>
  );
}

function GrupoProveedor({ grupo }: { grupo: GrupoProveedorMrp }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(grupo.lineas.map((l) => [l.insumoId, true]))
  );
  const [cantidades, setCantidades] = useState<Record<number, number>>(() =>
    Object.fromEntries(grupo.lineas.map((l) => [l.insumoId, l.cantidadSugerida]))
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const lineasSeleccionadas = useMemo(
    () => grupo.lineas.filter((l) => seleccion[l.insumoId]),
    [grupo.lineas, seleccion]
  );
  const costoTotal = lineasSeleccionadas.reduce(
    (acc, l) => acc + cantidades[l.insumoId] * l.costoMedio * l.factorConversion,
    0
  );

  function generar() {
    setError(null);
    if (!grupo.proveedorId) {
      setError("Estos insumos no tienen proveedor asignado.");
      return;
    }
    if (lineasSeleccionadas.length === 0) {
      setError("Selecciona al menos un insumo.");
      return;
    }
    startTransition(async () => {
      const resultado = await generarOrdenDesdeSugerencia(
        grupo.proveedorId!,
        lineasSeleccionadas.map((l) => ({
          insumoId: l.insumoId,
          cantidadCompra: cantidades[l.insumoId],
          precioUnitarioCompra: l.costoMedio * l.factorConversion,
        }))
      );
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo generar la orden.");
        return;
      }
      router.push(`/compras/${resultado.compraId}`);
    });
  }

  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
        <p className="text-sm font-semibold">{grupo.proveedorNombre}</p>
        <Button size="sm" onClick={generar} disabled={enviando || !grupo.proveedorId}>
          <ShoppingCart />
          {enviando ? "Generando…" : "Generar orden de compra"}
        </Button>
      </div>
      {error ? <p className="px-4 pt-2 text-xs text-destructive">{error}</p> : null}
      {!grupo.proveedorId ? (
        <p className="px-4 pt-2 text-xs text-muted-foreground">
          Asigna un proveedor a estos insumos para poder generar la orden.
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Insumo</TableHead>
            <TableHead className="text-right">Stock actual</TableHead>
            <TableHead className="text-right">Cobertura</TableHead>
            <TableHead>Pedir antes de</TableHead>
            <TableHead className="text-right">Cantidad sugerida</TableHead>
            <TableHead className="text-right">Costo estimado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupo.lineas.map((l) => (
            <TableRow key={l.insumoId}>
              <TableCell>
                <Checkbox
                  checked={seleccion[l.insumoId] ?? false}
                  onCheckedChange={(v) =>
                    setSeleccion((prev) => ({ ...prev, [l.insumoId]: v === true }))
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{l.insumoNombre}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatearCantidad(l.stockActual)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {Number.isFinite(l.coberturaDias) ? `${l.coberturaDias.toFixed(1)} d` : "—"}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {l.fechaPedido ?? "—"}
                  {l.urgente ? (
                    <Badge variant="outline" className="border-destructive text-destructive">
                      Urgente
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1.5">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="w-24 text-right"
                    value={cantidades[l.insumoId]}
                    onChange={(e) =>
                      setCantidades((prev) => ({
                        ...prev,
                        [l.insumoId]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {l.unidadCompra}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatearPesos(cantidades[l.insumoId] * l.costoMedio * l.factorConversion)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t px-4 py-2.5 text-right text-sm">
        Total seleccionado: <span className="font-medium">{formatearPesos(costoTotal)}</span>
      </div>
    </div>
  );
}
