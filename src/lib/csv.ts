// Exportación CSV client-safe (sin dependencias de servidor). §7.8: "Exportación
// a CSV en todos los reportes."

function escaparCelda(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function descargarCsv(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number)[][]
): void {
  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(escaparCelda).join(","))
    .join("\n");
  const blob = new Blob([`﻿${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
