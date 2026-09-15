"use client";

import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETIQUETAS_ROL, type RolUsuario } from "@/lib/validaciones/usuario";
import { cambiarEstadoUsuario } from "./actions";
import { UsuarioForm, type UsuarioParaEditar } from "./usuario-form";

export interface FilaUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  esUsuarioActual: boolean;
  form: UsuarioParaEditar;
}

export function UsuariosTable({ filas }: { filas: FilaUsuario[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                Aún no hay usuarios.
              </TableCell>
            </TableRow>
          ) : (
            filas.map((f) => (
              <TableRow key={f.id} className={f.activo ? "" : "opacity-50"}>
                <TableCell className="font-medium">
                  {f.nombre}
                  {f.esUsuarioActual ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{f.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ETIQUETAS_ROL[f.rol]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {f.activo ? "Activo" : "Inactivo"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <UsuarioForm
                      usuario={f.form}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-7">
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                    {!f.esUsuarioActual ? (
                      <form action={cambiarEstadoUsuario.bind(null, f.id, !f.activo)}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" type="submit">
                          {f.activo ? "Desactivar" : "Activar"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
