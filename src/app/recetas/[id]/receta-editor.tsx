"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatearCantidad, formatearPesos, formatearPorcentaje } from "@/lib/formato";
import { costearProducto, type SemaforoFoodCost } from "@/lib/motor/recetas";
import { duplicarReceta, guardarReceta } from "../actions";

interface InsumoDisponible {
  id: number;
  nombre: string;
  unidadBase: string;
  mermaPct: number;
  costoMedio: number;
}

interface ProductoInfo {
  id: number;
  codigo: string;
  nombre: string;
  precioVenta: number;
  tiempoPreparacionMin: number;
  esReventa: boolean;
}

const COLOR_SEMAFORO: Record<SemaforoFoodCost, string> = {
  verde: "text-emerald-600 dark:text-emerald-400",
  ambar: "text-amber-600 dark:text-amber-400",
  rojo: "text-red-600 dark:text-red-400",
};

let contadorLinea = 0;
function idLinea() {
  contadorLinea += 1;
  return contadorLinea;
}

export function RecetaEditor({
  producto,
  insumos,
  lineasIniciales,
  ivaPct,
  preciosIncluyenIva,
}: {
  producto: ProductoInfo;
  insumos: InsumoDisponible[];
  lineasIniciales: { insumoId: number; cantidad: number }[];
  ivaPct: number;
  preciosIncluyenIva: boolean;
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState(() =>
    lineasIniciales.length > 0
      ? lineasIniciales.map((l) => ({ key: idLinea(), ...l }))
      : [{ key: idLinea(), insumoId: null as number | null, cantidad: 1 }]
  );
  const [guardando, startGuardar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const costeo = useMemo(() => {
    const recetaLineas = lineas
      .filter((l): l is typeof l & { insumoId: number } => l.insumoId !== null)
      .map((l) => ({
        productoId: producto.id,
        insumoId: l.insumoId,
        cantidad: l.cantidad,
        mermaPct: insumoPorId.get(l.insumoId)?.mermaPct ?? 0,
      }));

    return costearProducto({
      precioVenta: producto.precioVenta,
      ivaPct,
      preciosIncluyenIva,
      recetaLineas,
      costoMedioPorInsumo: Object.fromEntries(
        insumos.map((i) => [i.id, i.costoMedio])
      ),
    });
  }, [lineas, insumoPorId, insumos, producto, ivaPct, preciosIncluyenIva]);

  function actualizarLinea(key: number, cambios: Partial<{ insumoId: number; cantidad: number }>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(key: number) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, { key: idLinea(), insumoId: null, cantidad: 1 }]);
  }

  function guardar() {
    setMensaje(null);
    startGuardar(async () => {
      const validas = lineas.filter(
        (l): l is typeof l & { insumoId: number } => l.insumoId !== null && l.cantidad > 0
      );
      await guardarReceta(
        producto.id,
        validas.map((l) => ({ insumoId: l.insumoId, cantidad: l.cantidad }))
      );
      setMensaje("Receta guardada.");
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{producto.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {producto.codigo}
            {producto.esReventa ? " · Reventa directa" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DuplicarRecetaDialog
            productoId={producto.id}
            onDuplicado={(nuevoId) => router.push(`/recetas/${nuevoId}`)}
          />
          <Button onClick={guardar} disabled={guardando}>
            <Save />
            {guardando ? "Guardando…" : "Guardar receta"}
          </Button>
        </div>
      </div>

      {mensaje ? <p className="mb-4 text-sm text-muted-foreground">{mensaje}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Insumo</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Merma</th>
                  <th className="px-3 py-2 text-right font-medium">Costo unit.</th>
                  <th className="px-3 py-2 text-right font-medium">Costo total</th>
                  <th className="px-3 py-2 text-right font-medium">% del plato</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea) => {
                  const insumo = linea.insumoId ? insumoPorId.get(linea.insumoId) : undefined;
                  const desglose = costeo.desglose.find((d) => d.insumoId === linea.insumoId);
                  return (
                    <tr key={linea.key} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <Select
                          value={linea.insumoId?.toString() ?? ""}
                          onValueChange={(v) => actualizarLinea(linea.key, { insumoId: Number(v) })}
                        >
                          <SelectTrigger className="w-full min-w-40">
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
                            value={linea.cantidad}
                            onChange={(e) =>
                              actualizarLinea(linea.key, { cantidad: Number(e.target.value) || 0 })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {insumo?.unidadBase ?? ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {insumo ? formatearPorcentaje(insumo.mermaPct) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {desglose ? formatearPesos(desglose.costoUnitario) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {desglose ? formatearPesos(desglose.costoTotal) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {desglose ? formatearPorcentaje(desglose.participacionPct) : "—"}
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
            <div className="p-2">
              <Button variant="ghost" size="sm" onClick={agregarLinea}>
                <Plus />
                Agregar insumo
              </Button>
            </div>
          </div>

          {costeo.desglose.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Participación en el costo del plato
              </p>
              <div className="flex flex-col gap-2">
                {[...costeo.desglose]
                  .sort((a, b) => b.participacionPct - a.participacionPct)
                  .map((d) => (
                    <div key={d.insumoId} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                        {insumoPorId.get(d.insumoId)?.nombre}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, d.participacionPct * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums">
                        {formatearPorcentaje(d.participacionPct)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-xs text-muted-foreground">
            Cambiar una receta recalcula el consumo histórico. Los costos de
            períodos ya cerrados pueden variar.
          </p>
        </div>

        <div className="h-fit rounded-xl border p-4">
          <dl className="grid gap-3 text-sm">
            <Fila etiqueta="Precio de venta" valor={formatearPesos(producto.precioVenta)} />
            <Fila etiqueta="Precio neto" valor={formatearPesos(costeo.precioVentaNeto)} />
            <Fila etiqueta="Costo teórico" valor={formatearPesos(costeo.costoTeorico)} destacado />
            <Fila etiqueta="Margen unitario" valor={formatearPesos(costeo.margenUnitario)} />
            <Fila
              etiqueta="Food cost"
              valor={
                <span className={COLOR_SEMAFORO[costeo.semaforo]}>
                  {formatearPorcentaje(costeo.foodCostPct)}
                </span>
              }
            />
            <Fila
              etiqueta="Tiempo de preparación"
              valor={`${formatearCantidad(producto.tiempoPreparacionMin)} min`}
            />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className={destacado ? "font-semibold" : "tabular-nums"}>{valor}</dd>
    </div>
  );
}

function DuplicarRecetaDialog({
  productoId,
  onDuplicado,
}: {
  productoId: number;
  onDuplicado: (nuevoId: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const codigo = String(formData.get("codigo") ?? "");
      const nombre = String(formData.get("nombre") ?? "");
      const resultado = await duplicarReceta(productoId, codigo, nombre);
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo duplicar.");
        return;
      }
      setAbierto(false);
      onDuplicado(resultado.nuevoId!);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Copy />
          Duplicar receta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplicar receta</DialogTitle>
          <DialogDescription>
            Crea un producto nuevo con la misma receta como punto de partida.
          </DialogDescription>
        </DialogHeader>
        <form action={enviar} className="grid gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid gap-1.5">
            <Label>Código del nuevo producto</Label>
            <Input name="codigo" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Nombre del nuevo producto</Label>
            <Input name="nombre" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
