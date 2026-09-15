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
  actualizarProveedor,
  crearProveedor,
  type EstadoFormularioProveedor,
} from "@/lib/api/proveedores";

export interface ProveedorParaEditar {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  leadTimeDias: number;
  condicionPago: string;
}

export function ProveedorForm({
  proveedor,
  trigger,
}: {
  proveedor?: ProveedorParaEditar;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoFormularioProveedor>({ ok: false });
  const [enviando, startTransition] = useTransition();
  const idFormulario = useId();
  const esEdicion = Boolean(proveedor);

  function enviar(formData: FormData) {
    startTransition(async () => {
      const resultado = esEdicion
        ? await actualizarProveedor(proveedor!.id, estado, formData)
        : await crearProveedor(estado, formData);
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
            Nuevo proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            Datos de contacto y condiciones. Se usa como proveedor preferente
            en el maestro de insumos.
          </DialogDescription>
        </DialogHeader>

        <form id={idFormulario} action={enviar} className="grid gap-4">
          {estado.mensajeGeneral ? (
            <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
          ) : null}

          <Campo label="Nombre" error={error("nombre")}>
            <Input name="nombre" defaultValue={proveedor?.nombre} required />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Contacto" error={error("contacto")}>
              <Input name="contacto" defaultValue={proveedor?.contacto} />
            </Campo>
            <Campo label="Teléfono" error={error("telefono")}>
              <Input name="telefono" defaultValue={proveedor?.telefono} />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Email" error={error("email")}>
              <Input name="email" type="email" defaultValue={proveedor?.email} />
            </Campo>
            <Campo label="Lead time por defecto (días)" error={error("leadTimeDias")}>
              <Input
                name="leadTimeDias"
                type="number"
                min="0"
                step="1"
                defaultValue={proveedor?.leadTimeDias ?? "3"}
                required
              />
            </Campo>
          </div>

          <Campo label="Condición de pago" error={error("condicionPago")}>
            <Input
              name="condicionPago"
              placeholder='ej. "30 días"'
              defaultValue={proveedor?.condicionPago}
            />
          </Campo>
        </form>

        <DialogFooter>
          <Button type="submit" form={idFormulario} disabled={enviando}>
            {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear proveedor"}
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
