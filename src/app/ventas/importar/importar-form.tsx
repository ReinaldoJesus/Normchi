"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importarVentasCsv, type FilaCsvVenta, type ResultadoImportacionCsv } from "./actions";

function parseCsv(texto: string): string[][] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(",").map((celda) => celda.trim()));
}

export function ImportarForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaCsvVenta[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacionCsv | null>(null);
  const [enviando, startTransition] = useTransition();

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setResultado(null);
    setError(null);
    setNombreArchivo(archivo.name);

    const texto = await archivo.text();
    const filasCrudas = parseCsv(texto);
    if (filasCrudas.length === 0) {
      setError("El archivo está vacío.");
      setFilas([]);
      return;
    }

    const primera = filasCrudas[0].map((c) => c.toLowerCase());
    const tieneEncabezado = primera[0] === "fecha";
    const datos = tieneEncabezado ? filasCrudas.slice(1) : filasCrudas;

    setFilas(
      datos.map((cols) => ({
        fecha: cols[0] ?? "",
        codigoProducto: cols[1] ?? "",
        cantidad: cols[2] ?? "",
        precioUnitario: cols[3] ?? "",
        canal: cols[4] ?? "",
      }))
    );
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const r = await importarVentasCsv(filas);
      setResultado(r);
    });
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-dashed p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onArchivo}
        />
        <Upload className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
        <p className="mb-3 text-sm text-muted-foreground">
          Columnas: <code className="font-mono">fecha,codigo_producto,cantidad,precio_unitario,canal</code>
        </p>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          {nombreArchivo ?? "Elegir archivo CSV"}
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {filas.length > 0 && !resultado ? (
        <div>
          <div className="mb-4 overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.slice(0, 50).map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{f.fecha}</TableCell>
                    <TableCell className="font-mono text-xs">{f.codigoProducto}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.cantidad}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.precioUnitario}</TableCell>
                    <TableCell>{f.canal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filas.length > 50 ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Mostrando 50 de {filas.length} filas. Se procesarán todas al confirmar.
            </p>
          ) : null}
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Importando…" : `Confirmar e importar (${filas.length} filas)`}
          </Button>
        </div>
      ) : null}

      {resultado ? (
        <div className="rounded-xl border p-4">
          <p className="mb-1 text-sm font-medium">
            {resultado.filasValidas} de {resultado.totalFilas} filas importadas, en{" "}
            {resultado.diasImportados} día(s).
          </p>
          {resultado.errores.length > 0 ? (
            <>
              <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">
                Filas con error
              </p>
              <ul className="space-y-1 text-xs text-destructive">
                {resultado.errores.map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.mensaje}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sin errores.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
