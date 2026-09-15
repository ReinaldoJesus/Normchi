"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fechaLocalAhora } from "@/lib/fechas";
import { MOTIVOS_AJUSTE } from "@/lib/validaciones/ajuste";
import { crearAjuste } from "@/lib/api/inventario";

const ETIQUETA_MOTIVO: Record<(typeof MOTIVOS_AJUSTE)[number], string> = {
  conteo_fisico: "Conteo físico",
  merma: "Merma",
  vencimiento: "Vencimiento",
  error_registro: "Error de registro",
  otro: "Otro",
};

export function AjusteForm({
  insumos,
}: {
  insumos: { id: number; nombre: string; unidadBase: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [insumoId, setInsumoId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(fechaLocalAhora());
  const [sentido, setSentido] = useState<"disminuir" | "aumentar">("disminuir");
  const [magnitud, setMagnitud] = useState(0);
  const [motivo, setMotivo] = useState<(typeof MOTIVOS_AJUSTE)[number]>("conteo_fisico");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const idFormulario = useId();

  const insumoSeleccionado = insumos.find((i) => i.id === insumoId);

  function enviar() {
    setError(null);
    if (!insumoId) {
      setError("Selecciona un insumo.");
      return;
    }
    if (magnitud <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    startTransition(async () => {
      const resultado = await crearAjuste({
        fecha,
        insumoId,
        cantidadDelta: sentido === "disminuir" ? -magnitud : magnitud,
        motivo,
        nota,
      });
      if (!resultado.ok) {
        setError(
          resultado.mensaje ??
            Object.values(resultado.errores ?? {})[0]?.[0] ??
            "No se pudo crear el ajuste."
        );
        return;
      }
      setAbierto(false);
      setMagnitud(0);
      setNota("");
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nuevo ajuste
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo ajuste de inventario</DialogTitle>
          <DialogDescription>
            Corrige el stock por conteo físico, merma, vencimiento u otro
            motivo. No afecta el costo medio.
          </DialogDescription>
        </DialogHeader>

        <form id={idFormulario} className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-1.5">
            <Label>Insumo</Label>
            <Select onValueChange={(v) => setInsumoId(Number(v))}>
              <SelectTrigger className="w-full">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Motivo</Label>
              <Select
                value={motivo}
                onValueChange={(v) => setMotivo(v as (typeof MOTIVOS_AJUSTE)[number])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_AJUSTE.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ETIQUETA_MOTIVO[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Ajuste</Label>
            <div className="flex items-center gap-2">
              <Select
                value={sentido}
                onValueChange={(v) => setSentido(v as "disminuir" | "aumentar")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disminuir">Disminuir stock</SelectItem>
                  <SelectItem value="aumentar">Aumentar stock</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="any"
                min="0"
                className="flex-1"
                value={magnitud || ""}
                onChange={(e) => setMagnitud(Number(e.target.value) || 0)}
              />
              <span className="w-8 shrink-0 text-xs text-muted-foreground">
                {insumoSeleccionado?.unidadBase ?? ""}
              </span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Nota</Label>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        </form>

        <DialogFooter>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Guardando…" : "Crear ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
