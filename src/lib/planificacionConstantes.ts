// Constantes y helpers puros de planificación, sin dependencias de servidor
// (Prisma/pg) — seguros para importar desde componentes cliente.
// Los valores configurables por el usuario (horizonte por defecto, ventana
// histórica, alpha, capacidad, días de operación) viven en la tabla
// `parametros` — ver src/lib/parametros.ts — y se pasan como props desde el
// componente de servidor. Aquí solo quedan las opciones fijas de la UI.

export const HORIZONTES_DISPONIBLES = [7, 14, 28] as const;

export function sumarDiasStr(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
