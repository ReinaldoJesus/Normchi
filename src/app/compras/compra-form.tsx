"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatearPesos } from "@/lib/formato";
import { actualizarCompra, crearCompra } from "./actions";

interface Proveedor {
  id: number;
  nombre: string;
  leadTimeDias: number;
}

interface InsumoOpcion {
  id: number;
  nombre: string;
  unidadCompra: string;
}

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

let contador = 0;
function idLinea() {
  contador += 1;
  return contador;
}

export interface CompraExistente {
  id: number;
  proveedorId: number;
  fechaEmision: string;
  fechaEsperada: string;
  documento: string;
  nota: string;
  lineas: { insumoId: number; cantidadCompra: number; precioUnitarioCompra: number }[];
}

export function CompraForm({
  proveedores,
  insumos,
  fechaHoy,
  compraExistente,
}: {
  proveedores: Proveedor[];
  insumos: InsumoOpcion[];
  fechaHoy: string;
  compraExistente?: CompraExistente;
}) {
  const router = useRouter();
  const esEdicion = Boolean(compraExistente);
  const [proveedorId, setProveedorId] = useState<number | null>(
    compraExistente?.proveedorId ?? null
  );
  const [fechaEmision, setFechaEmision] = useState(compraExistente?.fechaEmision ?? fechaHoy);
  const [fechaEsperada, setFechaEsperada] = useState(
    compraExistente?.fechaEsperada ?? fechaHoy
  );
  const [documento, setDocumento] = useState(compraExistente?.documento ?? "");
  const [nota, setNota] = useState(compraExistente?.nota ?? "");
  const [lineas, setLineas] = useState(() =>
    compraExistente && compraExistente.lineas.length > 0
      ? compraExistente.lineas.map((l) => ({ key: idLinea(), ...l }))
      : [{ key: idLinea(), insumoId: null as number | null, cantidadCompra: 1, precioUnitarioCompra: 0 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const total = lineas.reduce(
    (acc, l) => acc + l.cantidadCompra * l.precioUnitarioCompra,
    0
  );

  function actualizarLinea(key: number, cambios: Partial<(typeof lineas)[number]>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [
      ...prev,
      { key: idLinea(), insumoId: null, cantidadCompra: 1, precioUnitarioCompra: 0 },
    ]);
  }

  function quitarLinea(key: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function seleccionarProveedor(id: string) {
    const p = proveedores.find((pv) => pv.id === Number(id));
    setProveedorId(Number(id));
    if (p) setFechaEsperada(sumarDias(fechaEmision, p.leadTimeDias));
  }

  function enviar() {
    setError(null);
    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }
    const lineasValidas = lineas.filter((l) => l.insumoId !== null && l.cantidadCompra > 0);
    if (lineasValidas.length === 0) {
      setError("Agrega al menos una línea con insumo y cantidad.");
      return;
    }

    const datos = {
      proveedorId,
      fechaEmision,
      fechaEsperada,
      documento,
      nota,
      lineas: lineasValidas.map((l) => ({
        insumoId: l.insumoId!,
        cantidadCompra: l.cantidadCompra,
        precioUnitarioCompra: l.precioUnitarioCompra,
      })),
    };

    startTransition(async () => {
      const resultado = esEdicion
        ? await actualizarCompra(compraExistente!.id, datos)
        : await crearCompra(datos);
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo guardar la orden.");
        return;
      }
      router.push(`/compras/${resultado.compraId ?? compraExistente!.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl">
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label>Proveedor</Label>
          <Select
            defaultValue={compraExistente?.proveedorId.toString()}
            onValueChange={seleccionarProveedor}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Fecha de emisión</Label>
          <Input
            type="date"
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Fecha esperada</Label>
          <Input
            type="date"
            value={fechaEsperada}
            onChange={(e) => setFechaEsperada(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Documento</Label>
          <Input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="N° factura o guía"
          />
        </div>
      </div>

      <div className="rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Insumo</th>
              <th className="px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="px-3 py-2 text-right font-medium">Precio unitario</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea) => {
              const insumo = linea.insumoId ? insumoPorId.get(linea.insumoId) : undefined;
              return (
                <tr key={linea.key} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Select
                      value={linea.insumoId?.toString() ?? ""}
                      onValueChange={(v) => actualizarLinea(linea.key, { insumoId: Number(v) })}
                    >
                      <SelectTrigger className="w-full min-w-44">
                        <SelectValue placeholder="Seleccionar insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.map((i) => (
                          <SelectItem key={i.id} value={i.id.toString()}>
                            {i.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="w-24 text-right"
                        value={linea.cantidadCompra}
                        onChange={(e) =>
                          actualizarLinea(linea.key, {
                            cantidadCompra: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {insumo?.unidadCompra ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      className="w-28 text-right"
                      value={linea.precioUnitarioCompra}
                      onChange={(e) =>
                        actualizarLinea(linea.key, {
                          precioUnitarioCompra: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatearPesos(linea.cantidadCompra * linea.precioUnitarioCompra)}
                  </td>
                  <td className="px-1 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => quitarLinea(linea.key)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-2">
          <Button variant="ghost" size="sm" onClick={agregarLinea}>
            <Plus />
            Agregar línea
          </Button>
          <p className="pr-3 text-sm">
            Total: <span className="font-semibold tabular-nums">{formatearPesos(total)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-1.5">
        <Label>Nota</Label>
        <Input value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={enviar} disabled={enviando}>
          {enviando
            ? "Guardando…"
            : esEdicion
              ? "Guardar cambios"
              : "Crear orden (borrador)"}
        </Button>
      </div>
    </div>
  );
}
