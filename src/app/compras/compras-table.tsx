"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
import { formatearPesos } from "@/lib/formato";

export type EstadoCompra = "borrador" | "pendiente" | "recibida" | "anulada";

export interface FilaCompra {
  id: number;
  folio: string;
  proveedorNombre: string;
  fechaEmision: string;
  fechaEsperada: string;
  estado: EstadoCompra;
  total: number;
  vencida: boolean;
}

const ESTILO_ESTADO: Record<EstadoCompra, string> = {
  borrador: "bg-muted text-muted-foreground",
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  recibida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  anulada: "bg-destructive/10 text-destructive",
};

const ETIQUETA_ESTADO: Record<EstadoCompra, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  recibida: "Recibida",
  anulada: "Anulada",
};

const TODOS = "todos";

export function ComprasTable({ filas }: { filas: FilaCompra[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string>(TODOS);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (q && !`${f.folio} ${f.proveedorNombre}`.toLowerCase().includes(q)) return false;
      if (estado !== TODOS && f.estado !== estado) return false;
      return true;
    });
  }, [filas, busqueda, estado]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por folio o proveedor"
          className="max-w-xs"
        />
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="recibida">Recibida</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Emisión</TableHead>
              <TableHead>Esperada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay órdenes de compra.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/compras/${f.id}`} className="hover:underline">
                      {f.folio}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{f.proveedorNombre}</TableCell>
                  <TableCell className="text-muted-foreground">{f.fechaEmision}</TableCell>
                  <TableCell
                    className={f.vencida ? "text-destructive" : "text-muted-foreground"}
                  >
                    {f.fechaEsperada}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTILO_ESTADO[f.estado]} variant="outline">
                      {ETIQUETA_ESTADO[f.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.total)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <Link href={`/compras/${f.id}`}>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
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
