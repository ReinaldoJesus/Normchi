"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearPesos } from "@/lib/formato";
import { recibirCompra } from "./actions";

export interface LineaParaRecibir {
  compraLineaId: number;
  insumoNombre: string;
  unidadCompra: string;
  cantidadPedida: number;
  precioUnitarioCompra: number;
}

export function RecepcionForm({
  compraId,
  lineas,
  fechaHoy,
}: {
  compraId: number;
  lineas: LineaParaRecibir[];
  fechaHoy: string;
}) {
  const router = useRouter();
  const [fechaRecepcion, setFechaRecepcion] = useState(fechaHoy);
  const [valores, setValores] = useState(() =>
    Object.fromEntries(
      lineas.map((l) => [
        l.compraLineaId,
        { cantidadRecibida: l.cantidadPedida, precioUnitarioCompra: l.precioUnitarioCompra },
      ])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function actualizar(
    id: number,
    campo: "cantidadRecibida" | "precioUnitarioCompra",
    valor: number
  ) {
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const resultado = await recibirCompra(
        compraId,
        fechaRecepcion,
        lineas.map((l) => ({
          compraLineaId: l.compraLineaId,
          cantidadRecibida: valores[l.compraLineaId].cantidadRecibida,
          precioUnitarioCompra: valores[l.compraLineaId].precioUnitarioCompra,
        }))
      );
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo confirmar la recepción.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ajusta la cantidad recibida y el precio si la factura vino distinta.
        Al confirmar se generan los movimientos de inventario.
      </p>

      <div className="mb-4 grid max-w-xs gap-1.5">
        <Label>Fecha de recepción</Label>
        <Input
          type="date"
          value={fechaRecepcion}
          onChange={(e) => setFechaRecepcion(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Insumo</th>
              <th className="px-3 py-2 text-right font-medium">Pedido</th>
              <th className="px-3 py-2 text-right font-medium">Recibido</th>
              <th className="px-3 py-2 text-right font-medium">Precio unitario</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => {
              const v = valores[l.compraLineaId];
              return (
                <tr key={l.compraLineaId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{l.insumoNombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {l.cantidadPedida} {l.unidadCompra}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      className="ml-auto w-24 text-right"
                      value={v.cantidadRecibida}
                      onChange={(e) =>
                        actualizar(
                          l.compraLineaId,
                          "cantidadRecibida",
                          Number(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      className="ml-auto w-28 text-right"
                      value={v.precioUnitarioCompra}
                      onChange={(e) =>
                        actualizar(
                          l.compraLineaId,
                          "precioUnitarioCompra",
                          Number(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatearPesos(v.cantidadRecibida * v.precioUnitarioCompra)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button onClick={confirmar} disabled={enviando}>
          <PackageCheck />
          {enviando ? "Confirmando…" : "Confirmar recepción"}
        </Button>
      </div>
    </div>
  );
}
