"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatearPesos } from "@/lib/formato";
import type { CanalVenta } from "@/generated/prisma";
import {
  guardarCierreDia,
  marcarDiaSinOperacion,
  reabrirDia,
  type ResumenCierreDia,
} from "./actions";
import { ResumenDia } from "./resumen-dia";

export interface ProductoCierre {
  id: number;
  nombre: string;
  categoria: "comida" | "bebida";
  precioVenta: number;
  costoTeorico: number;
  cantidadInicial: number | null;
}

const CANALES: { value: CanalVenta; etiqueta: string }[] = [
  { value: "salon", etiqueta: "Salón" },
  { value: "delivery", etiqueta: "Delivery" },
  { value: "retiro", etiqueta: "Retiro" },
];

function aTexto(valor: number | null): string {
  return valor === null ? "" : String(valor);
}

export function CierreDia({
  fecha,
  canal,
  productos,
  diaCerrado,
  yaRegistrado,
}: {
  fecha: string;
  canal: CanalVenta;
  dow: number;
  productos: ProductoCierre[];
  diaCerrado: { motivo: string | null } | null;
  yaRegistrado: boolean;
}) {
  const router = useRouter();
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCierreDia | null>(null);

  const [cantidades, setCantidades] = useState<Record<number, string>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, aTexto(p.cantidadInicial)]))
  );
  const [precios, setPrecios] = useState<Record<number, number>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, p.precioVenta]))
  );

  const comida = useMemo(() => productos.filter((p) => p.categoria === "comida"), [productos]);
  const bebida = useMemo(() => productos.filter((p) => p.categoria === "bebida"), [productos]);
  const ordenVisual = useMemo(() => [...comida, ...bebida], [comida, bebida]);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const totales = useMemo(() => {
    function calcular(lista: ProductoCierre[]) {
      return lista.reduce(
        (acc, p) => {
          const cantidad = Number(cantidades[p.id]) || 0;
          const precio = precios[p.id] ?? p.precioVenta;
          acc.unidades += cantidad;
          acc.ingreso += cantidad * precio;
          acc.margen += cantidad * (precio - p.costoTeorico);
          return acc;
        },
        { unidades: 0, ingreso: 0, margen: 0 }
      );
    }
    return { comida: calcular(comida), bebida: calcular(bebida) };
  }, [cantidades, precios, comida, bebida]);

  function irA(nuevaFecha: string, nuevoCanal: CanalVenta) {
    router.push(`/ventas?fecha=${nuevaFecha}&canal=${nuevoCanal}`);
  }

  function guardar() {
    setError(null);
    setResumen(null);
    const lineas = productos.map((p) => ({
      productoId: p.id,
      cantidad: Number(cantidades[p.id]) || 0,
      precioUnitario: precios[p.id] ?? p.precioVenta,
    }));

    startTransition(async () => {
      const resultado = await guardarCierreDia({ fecha, canal, lineas });
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo guardar el cierre de día.");
        return;
      }
      setResumen(resultado.resumen ?? null);
      router.refresh();
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        guardar();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidades, precios, fecha, canal]);

  function manejarEnterCantidad(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const siguiente = ordenVisual[index + 1];
      const ref = siguiente ? inputRefs.current[siguiente.id] : null;
      if (ref) {
        ref.focus();
        ref.select();
      }
    }
  }

  if (diaCerrado) {
    return (
      <div className="max-w-2xl rounded-xl border bg-muted/30 p-6">
        <div className="mb-4 flex items-center gap-4">
          <Input
            type="date"
            value={fecha}
            onChange={(e) => irA(e.target.value, canal)}
            className="w-44"
          />
        </div>
        <p className="mb-1 font-medium">Este día está marcado como cierre.</p>
        {diaCerrado.motivo ? (
          <p className="mb-4 text-sm text-muted-foreground">{diaCerrado.motivo}</p>
        ) : null}
        <Button
          variant="secondary"
          onClick={() =>
            startTransition(async () => {
              await reabrirDia(fecha);
              router.refresh();
            })
          }
          disabled={enviando}
        >
          Reabrir día
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={fecha}
            onChange={(e) => irA(e.target.value, canal)}
            className="w-44"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Canal</Label>
          <Select value={canal} onValueChange={(v) => irA(fecha, v as CanalVenta)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANALES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {yaRegistrado ? (
          <span className="mb-1.5 text-xs text-muted-foreground">
            Día ya registrado — editar y guardar recalcula el inventario.
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <MarcarSinOperacionDialog fecha={fecha} />
          <Button onClick={guardar} disabled={enviando}>
            <Save />
            {enviando ? "Guardando…" : "Guardar (Ctrl+Enter)"}
          </Button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <BloqueCategoria
          titulo="Comidas"
          productos={comida}
          indiceBase={0}
          cantidades={cantidades}
          precios={precios}
          setCantidades={setCantidades}
          setPrecios={setPrecios}
          inputRefs={inputRefs}
          onEnterCantidad={manejarEnterCantidad}
          totales={totales.comida}
        />
        <BloqueCategoria
          titulo="Bebidas"
          productos={bebida}
          indiceBase={comida.length}
          cantidades={cantidades}
          precios={precios}
          setCantidades={setCantidades}
          setPrecios={setPrecios}
          inputRefs={inputRefs}
          onEnterCantidad={manejarEnterCantidad}
          totales={totales.bebida}
        />
      </div>

      {resumen ? <ResumenDia resumen={resumen} className="mt-6" /> : null}
    </div>
  );
}

function BloqueCategoria({
  titulo,
  productos,
  indiceBase,
  cantidades,
  precios,
  setCantidades,
  setPrecios,
  inputRefs,
  onEnterCantidad,
  totales,
}: {
  titulo: string;
  productos: ProductoCierre[];
  indiceBase: number;
  cantidades: Record<number, string>;
  precios: Record<number, number>;
  setCantidades: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setPrecios: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  inputRefs: React.RefObject<Record<number, HTMLInputElement | null>>;
  onEnterCantidad: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  totales: { unidades: number; ingreso: number; margen: number };
}) {
  return (
    <div className="rounded-xl border">
      <div className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </div>
      {productos.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Sin productos activos.</p>
      ) : (
        <div className="divide-y">
          {productos.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 truncate text-sm">{p.nombre}</span>
              <Input
                type="number"
                step="any"
                min="0"
                className="w-24 text-right"
                value={precios[p.id] ?? p.precioVenta}
                onChange={(e) =>
                  setPrecios((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 0 }))
                }
              />
              <Input
                ref={(el) => {
                  inputRefs.current[p.id] = el;
                }}
                type="number"
                step="any"
                min="0"
                placeholder="—"
                className="w-20 text-right"
                value={cantidades[p.id] ?? ""}
                onChange={(e) =>
                  setCantidades((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                onKeyDown={(e) => onEnterCantidad(e, indiceBase + i)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <span>{totales.unidades} unidades</span>
        <span>{formatearPesos(totales.ingreso)}</span>
        <span>Margen est. {formatearPesos(totales.margen)}</span>
      </div>
    </div>
  );
}

function MarcarSinOperacionDialog({ fecha }: { fecha: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const resultado = await marcarDiaSinOperacion(fecha, motivo);
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo marcar el día.");
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <CalendarOff />
          El local no abrió este día
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar día sin operación</DialogTitle>
          <DialogDescription>
            El pronóstico distinguirá este día de uno que simplemente no se
            registró.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="grid gap-1.5">
          <Label>Motivo (opcional)</Label>
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="ej. Feriado, mantención"
          />
        </div>
        <DialogFooter>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando…" : "Marcar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
