"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { CATEGORIAS_PRODUCTO } from "@/lib/validaciones/producto";
import {
  actualizarProducto,
  crearProducto,
  type EstadoFormularioProducto,
} from "@/lib/api/productos";

export interface ProductoParaEditar {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  subcategoria: string;
  precioVenta: string;
  tiempoPreparacionMin: string;
  estacion: string;
  esReventa: boolean;
}

export function ProductoForm({
  producto,
  trigger,
}: {
  producto?: ProductoParaEditar;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoFormularioProducto>({ ok: false });
  const [enviando, startTransition] = useTransition();
  const [esReventa, setEsReventa] = useState(producto?.esReventa ?? false);
  const idFormulario = useId();
  const esEdicion = Boolean(producto);

  function enviar(formData: FormData) {
    startTransition(async () => {
      const resultado = esEdicion
        ? await actualizarProducto(producto!.id, estado, formData)
        : await crearProducto(estado, formData);
      setEstado(resultado);
      if (resultado.ok) {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Nuevo producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Plato o bebida que se vende. La receta (BOM) se arma después, en
            la ficha del producto.
          </DialogDescription>
        </DialogHeader>

        <form id={idFormulario} action={enviar} className="grid gap-4">
          {estado.mensajeGeneral ? (
            <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" error={error("codigo")}>
              <Input name="codigo" defaultValue={producto?.codigo} required />
            </Campo>
            <Campo label="Nombre" error={error("nombre")}>
              <Input name="nombre" defaultValue={producto?.nombre} required />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Categoría" error={error("categoria")}>
              <Select name="categoria" defaultValue={producto?.categoria ?? "comida"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PRODUCTO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "comida" ? "Comida" : "Bebida"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Subcategoría" error={error("subcategoria")}>
              <Input
                name="subcategoria"
                placeholder="ej. Fondos, Postres, Jugos"
                defaultValue={producto?.subcategoria}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Campo label="Precio de venta" error={error("precioVenta")}>
              <Input
                name="precioVenta"
                type="number"
                step="any"
                min="0"
                defaultValue={producto?.precioVenta}
                required
              />
            </Campo>
            <Campo label="Tiempo prep. (min)" error={error("tiempoPreparacionMin")}>
              <Input
                name="tiempoPreparacionMin"
                type="number"
                step="any"
                min="0"
                defaultValue={producto?.tiempoPreparacionMin ?? "5"}
                required
              />
            </Campo>
            <Campo label="Estación" error={error("estacion")}>
              <Input
                name="estacion"
                placeholder="ej. Parrilla"
                defaultValue={producto?.estacion}
              />
            </Campo>
          </div>

          {esEdicion ? null : (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="esReventa"
                  checked={esReventa}
                  onCheckedChange={(v) => setEsReventa(v === true)}
                />
                Producto de reventa directa (se compra y se vende sin transformación)
              </label>

              {esReventa ? (
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-3">
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Se creará un insumo espejo y una receta de una línea (1
                    unidad) automáticamente.
                  </p>
                  <Campo label="Unidad de compra del insumo" error={error("espejoUnidadCompra")}>
                    <Input
                      name="espejoUnidadCompra"
                      placeholder='ej. "caja 12 un"'
                      required={esReventa}
                    />
                  </Campo>
                  <Campo
                    label="Unidades por caja/bulto"
                    error={error("espejoFactorConversion")}
                  >
                    <Input
                      name="espejoFactorConversion"
                      type="number"
                      step="any"
                      min="1"
                      placeholder="12"
                      required={esReventa}
                    />
                  </Campo>
                  <Campo label="Stock inicial (un)" error={error("espejoStockInicial")}>
                    <Input name="espejoStockInicial" type="number" step="any" min="0" defaultValue="0" />
                  </Campo>
                  <Campo
                    label="Costo inicial ($/un)"
                    error={error("espejoCostoInicial")}
                  >
                    <Input name="espejoCostoInicial" type="number" step="any" min="0" defaultValue="0" />
                  </Campo>
                </div>
              ) : null}
            </>
          )}
        </form>

        <DialogFooter>
          <Button type="submit" form={idFormulario} disabled={enviando}>
            {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
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
