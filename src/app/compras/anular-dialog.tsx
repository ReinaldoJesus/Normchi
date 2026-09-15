"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

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
import { anularCompra } from "./actions";

export function AnularDialog({ compraId }: { compraId: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const resultado = await anularCompra(compraId, motivo);
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo anular.");
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:text-destructive">
          <Ban />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Anular orden de compra</DialogTitle>
          <DialogDescription>
            El registro no se borra: queda marcado como anulado. Si ya estaba
            recibida, sus movimientos se quitan del inventario.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="grid gap-1.5">
          <Label>Motivo (opcional)</Label>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={confirmar} disabled={enviando}>
            {enviando ? "Anulando…" : "Anular orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
