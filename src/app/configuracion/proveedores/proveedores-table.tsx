"use client";

import { Pencil } from "lucide-react";

import { BotonCambiarEstado } from "@/components/boton-cambiar-estado";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cambiarEstadoProveedor } from "@/lib/api/proveedores";
import { ProveedorForm, type ProveedorParaEditar } from "./proveedor-form";

export interface FilaProveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  leadTimeDias: number;
  condicionPago: string | null;
  activo: boolean;
  form: ProveedorParaEditar;
}

export function ProveedoresTable({ filas }: { filas: FilaProveedor[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Lead time</TableHead>
            <TableHead>Condición de pago</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                Aún no hay proveedores.
              </TableCell>
            </TableRow>
          ) : (
            filas.map((f) => (
              <TableRow key={f.id} className={f.activo ? "" : "opacity-50"}>
                <TableCell className="font-medium">{f.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{f.contacto ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.telefono ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.email ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{f.leadTimeDias} días</TableCell>
                <TableCell className="text-muted-foreground">
                  {f.condicionPago ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ProveedorForm
                      proveedor={f.form}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-7">
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                    <BotonCambiarEstado
                      activo={f.activo}
                      onCambiar={() => cambiarEstadoProveedor(f.id, !f.activo)}
                    />
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
