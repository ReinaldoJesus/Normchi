"use client";

import { useId, useState, useTransition } from "react";
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
import { ETIQUETAS_ROL, ROLES_USUARIO } from "@/lib/validaciones/usuario";
import {
  actualizarUsuario,
  crearUsuario,
  type EstadoFormularioUsuario,
} from "./actions";

export interface UsuarioParaEditar {
  id: string;
  nombre: string;
  email: string;
  rol: (typeof ROLES_USUARIO)[number];
}

export function UsuarioForm({
  usuario,
  trigger,
}: {
  usuario?: UsuarioParaEditar;
  trigger?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoFormularioUsuario>({ ok: false });
  const [enviando, startTransition] = useTransition();
  const idFormulario = useId();
  const esEdicion = Boolean(usuario);

  function enviar(formData: FormData) {
    startTransition(async () => {
      const resultado = esEdicion
        ? await actualizarUsuario(usuario!.id, estado, formData)
        : await crearUsuario(estado, formData);
      setEstado(resultado);
      if (resultado.ok) setAbierto(false);
    });
  }

  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setEstado({ ok: false });
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Nuevo usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Deja la contraseña en blanco para no cambiarla."
              : "Crea una cuenta local para acceder al sistema."}
          </DialogDescription>
        </DialogHeader>

        <form id={idFormulario} action={enviar} className="grid gap-4">
          {estado.mensajeGeneral ? (
            <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
          ) : null}

          <Campo label="Nombre" error={error("nombre")}>
            <Input name="nombre" defaultValue={usuario?.nombre} required />
          </Campo>

          <Campo label="Correo" error={error("email")}>
            <Input name="email" type="email" defaultValue={usuario?.email} required />
          </Campo>

          <Campo label="Rol" error={error("rol")}>
            <Select name="rol" defaultValue={usuario?.rol ?? "lectura"}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES_USUARIO.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ETIQUETAS_ROL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            label={esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
            error={error("password")}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required={!esEdicion}
              minLength={esEdicion ? undefined : 6}
            />
          </Campo>
        </form>

        <DialogFooter>
          <Button type="submit" form={idFormulario} disabled={enviando}>
            {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear usuario"}
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
