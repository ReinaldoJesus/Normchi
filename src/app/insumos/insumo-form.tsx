"use client";

import { useId, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CATEGORIAS_INSUMO_SUGERIDAS, UNIDADES_BASE } from "@/lib/validaciones/insumo";
import { actualizarInsumo, crearInsumo, type EstadoFormularioInsumo } from "./actions";

export interface InsumoParaEditar {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadBase: string;
  unidadCompra: string;
  factorConversion: string;
  mermaPct: string;
  stockSeguridad: string;
  loteMinimoCompra: string;
  leadTimeDias: number;
  proveedorId: number | null;
  perecible: boolean;
  stockInicial: string;
  costoInicial: string;
  tieneMovimientos: boolean;
}

export function InsumoForm({
  proveedores,
  insumo,
  trigger,
}: {
  proveedores: { id: number; nombre: string }[];
  insumo?: InsumoParaEditar;
  trigger?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoFormularioInsumo>({ ok: false });
  const [enviando, startTransition] = useTransition();
  const idFormulario = useId();
  const esEdicion = Boolean(insumo);

  function enviar(formData: FormData) {
    startTransition(async () => {
      const resultado = esEdicion
        ? await actualizarInsumo(insumo!.id, estado, formData)
        : await crearInsumo(estado, formData);
      setEstado(resultado);
      if (resultado.ok) setAbierto(false);
    });
  }

  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Nuevo insumo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>
            Materia prima de bodega. Las cantidades internas siempre se
            guardan en unidad base.
          </DialogDescription>
        </DialogHeader>

        <form id={idFormulario} action={enviar} className="grid gap-4">
          {estado.mensajeGeneral ? (
            <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" error={error("codigo")}>
              <Input name="codigo" defaultValue={insumo?.codigo} required />
            </Campo>
            <Campo label="Nombre" error={error("nombre")}>
              <Input name="nombre" defaultValue={insumo?.nombre} required />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Categoría" error={error("categoria")}>
              <Input
                name="categoria"
                defaultValue={insumo?.categoria}
                list="categorias-sugeridas"
                required
              />
              <datalist id="categorias-sugeridas">
                {CATEGORIAS_INSUMO_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Proveedor preferente" error={error("proveedorId")}>
              <Select
                name="proveedorId"
                defaultValue={insumo?.proveedorId?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Campo label="Unidad base" error={error("unidadBase")}>
              {insumo?.tieneMovimientos ? (
                <>
                  <input type="hidden" name="unidadBase" value={insumo.unidadBase} />
                  <Input value={insumo.unidadBase} readOnly disabled />
                  <p className="text-xs text-muted-foreground">
                    No se puede cambiar: ya tiene movimientos.
                  </p>
                </>
              ) : (
                <Select name="unidadBase" defaultValue={insumo?.unidadBase ?? "g"}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_BASE.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Campo>
            <Campo label="Unidad de compra" error={error("unidadCompra")}>
              <Input
                name="unidadCompra"
                placeholder='ej. "kg", "caja 12 un"'
                defaultValue={insumo?.unidadCompra}
                required
              />
            </Campo>
            <Campo label="Factor de conversión" error={error("factorConversion")}>
              <Input
                name="factorConversion"
                type="number"
                step="any"
                min="0"
                defaultValue={insumo?.factorConversion}
                required
              />
            </Campo>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Campo label="Merma (%)" error={error("mermaPorcentaje")}>
              <Input
                name="mermaPorcentaje"
                type="number"
                step="any"
                min="0"
                max="100"
                defaultValue={
                  insumo ? (Number(insumo.mermaPct) * 100).toString() : "0"
                }
                required
              />
            </Campo>
            <Campo label="Stock de seguridad" error={error("stockSeguridad")}>
              <Input
                name="stockSeguridad"
                type="number"
                step="any"
                min="0"
                defaultValue={insumo?.stockSeguridad ?? "0"}
                required
              />
            </Campo>
            <Campo label="Lead time (días)" error={error("leadTimeDias")}>
              <Input
                name="leadTimeDias"
                type="number"
                step="1"
                min="0"
                defaultValue={insumo?.leadTimeDias ?? "3"}
                required
              />
            </Campo>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Campo label="Lote mínimo de compra" error={error("loteMinimoCompra")}>
              <Input
                name="loteMinimoCompra"
                type="number"
                step="any"
                min="0"
                defaultValue={insumo?.loteMinimoCompra ?? "1"}
                required
              />
            </Campo>
            <Campo label="Stock inicial" error={error("stockInicial")}>
              <Input
                name="stockInicial"
                type="number"
                step="any"
                min="0"
                defaultValue={insumo?.stockInicial ?? "0"}
                required
                readOnly={insumo?.tieneMovimientos}
              />
            </Campo>
            <Campo label="Costo inicial ($/unidad base)" error={error("costoInicial")}>
              <Input
                name="costoInicial"
                type="number"
                step="any"
                min="0"
                defaultValue={insumo?.costoInicial ?? "0"}
                required
                readOnly={insumo?.tieneMovimientos}
              />
            </Campo>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="perecible"
              defaultChecked={insumo?.perecible}
            />
            Perecible
          </label>
        </form>

        <DialogFooter>
          <Button type="submit" form={idFormulario} disabled={enviando}>
            {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear insumo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
