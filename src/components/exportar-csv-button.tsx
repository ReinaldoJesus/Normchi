"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { descargarCsv } from "@/lib/csv";

export function ExportarCsvButton({
  nombreArchivo,
  encabezados,
  filas,
}: {
  nombreArchivo: string;
  encabezados: string[];
  filas: (string | number)[][];
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => descargarCsv(nombreArchivo, encabezados, filas)}
    >
      <Download />
      Exportar CSV
    </Button>
  );
}
