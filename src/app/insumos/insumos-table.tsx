"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatearCantidadLegible,
  formatearCostoUnitarioLegible,
  formatearPesos,
} from "@/lib/formato";
import { cambiarEstadoInsumo } from "./actions";
import { InsumoForm, type InsumoParaEditar } from "./insumo-form";

export type EstadoInsumo = "verde" | "ambar" | "negro";

export interface FilaInsumo {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadBase: "g" | "ml" | "un";
  unidadCompra: string;
  stockActual: number;
  stockSeguridad: number;
  costoMedio: number;
  valorBodega: number;
  proveedorId: number | null;
  proveedorNombre: string | null;
  estado: EstadoInsumo;
  activo: boolean;
  form: InsumoParaEditar;
}

const ESTADO_TODOS = "todos";
const SIN_PROVEEDOR = "__sin_proveedor__";

const ESTILO_ESTADO: Record<EstadoInsumo, string> = {
  verde: "bg-emerald-500",
  ambar: "bg-amber-500",
  negro: "bg-foreground",
};

const ETIQUETA_ESTADO: Record<EstadoInsumo, string> = {
  verde: "Sobre stock de seguridad",
  ambar: "Bajo stock de seguridad",
  negro: "Stock negativo",
};

export function InsumosTable({
  filas,
  categorias,
  proveedores,
}: {
  filas: FilaInsumo[];
  categorias: string[];
  proveedores: { id: number; nombre: string }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string>(ESTADO_TODOS);
  const [proveedorId, setProveedorId] = useState<string>(ESTADO_TODOS);
  const [estado, setEstado] = useState<string>(ESTADO_TODOS);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (q && !`${f.codigo} ${f.nombre}`.toLowerCase().includes(q)) return false;
      if (categoria !== ESTADO_TODOS && f.categoria !== categoria) return false;
      if (proveedorId !== ESTADO_TODOS) {
        if (proveedorId === SIN_PROVEEDOR && f.proveedorId !== null) return false;
        if (
          proveedorId !== SIN_PROVEEDOR &&
          f.proveedorId !== Number(proveedorId)
        )
          return false;
      }
      if (estado !== ESTADO_TODOS && f.estado !== estado) return false;
      return true;
    });
  }, [filas, busqueda, categoria, proveedorId, estado]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código"
            className="pl-8"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ESTADO_TODOS}>Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={proveedorId} onValueChange={setProveedorId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ESTADO_TODOS}>Todos los proveedores</SelectItem>
            <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ESTADO_TODOS}>Todos los estados</SelectItem>
            <SelectItem value="verde">Sobre stock de seguridad</SelectItem>
            <SelectItem value="ambar">Bajo stock de seguridad</SelectItem>
            <SelectItem value="negro">Stock negativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
              <TableHead className="text-right">Stock seguridad</TableHead>
              <TableHead className="text-right">Costo medio</TableHead>
              <TableHead className="text-right">Valor en bodega</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay insumos que coincidan con el filtro.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((f) => (
                <TableRow key={f.id} className={f.activo ? "" : "opacity-50"}>
                  <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.categoria}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="font-mono">
                        {f.unidadBase}
                      </Badge>
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {f.unidadCompra}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearCantidadLegible(f.stockActual, f.unidadBase)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatearCantidadLegible(f.stockSeguridad, f.unidadBase)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearCostoUnitarioLegible(f.costoMedio, f.unidadBase)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.valorBodega)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.proveedorNombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5"
                      title={ETIQUETA_ESTADO[f.estado]}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${ESTILO_ESTADO[f.estado]}`}
                      />
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {ETIQUETA_ESTADO[f.estado]}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <InsumoForm
                        proveedores={proveedores}
                        insumo={f.form}
                        trigger={
                          <Button variant="ghost" size="icon" className="size-7">
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <BotonEstado id={f.id} activo={f.activo} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BotonEstado({ id, activo }: { id: number; activo: boolean }) {
  return (
    <form action={cambiarEstadoInsumo.bind(null, id, !activo)}>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" type="submit">
        {activo ? "Desactivar" : "Activar"}
      </Button>
    </form>
  );
}
