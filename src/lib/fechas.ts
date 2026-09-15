import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const ZONA_HORARIA = "America/Santiago";

/**
 * Formatea una fecha como YYYY-MM-DD en la zona horaria del restaurante.
 * Nunca usar `Date.toISOString().slice(0, 10)`: convierte a UTC primero y
 * desfasa un día completo para horas nocturnas en un huso negativo
 * (ver especificación §8 y criterio de aceptación #21).
 */
export function toFechaLocal(fecha: Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, "yyyy-MM-dd");
}

export function fechaLocalAhora(): string {
  return toFechaLocal(new Date());
}

export function diaSemanaLocal(fecha: Date): number {
  // 0 = domingo .. 6 = sábado, calculado en la zona horaria local.
  return toZonedTime(fecha, ZONA_HORARIA).getDay();
}

/**
 * Extrae YYYY-MM-DD de un campo de fecha "pura" (columnas `@db.Date`:
 * fecha_emision, fecha_esperada, fecha_recepcion, ventas.fecha,
 * ajustes.fecha, dias_cierre.fecha). A diferencia de `toFechaLocal`, NO
 * convierte por zona horaria.
 *
 * Estos campos representan un día calendario, no un instante real, y se
 * guardan anclados a medianoche UTC (`new Date("YYYY-MM-DD")`). Pasarlos por
 * `toFechaLocal` los desfasa un día hacia atrás en un huso negativo como
 * America/Santiago — el mismo bug de fondo que el criterio de aceptación
 * #21 previene para timestamps reales, pero aplicado por error a un campo
 * que no tiene componente horario que convertir.
 */
export function toFechaCalendario(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
