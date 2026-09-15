// Especificación §6.8 — Carga de cocina (capacidad aproximada).

export interface DemandaProductoDia {
  fecha: string;
  productoId: number;
  cantidadPronosticada: number;
  tiempoPreparacionMin: number;
  estacion?: string | null;
}

export interface CargaDia {
  fecha: string;
  cargaMinutos: number;
  utilizacion: number;
  estado: "normal" | "ambar" | "rojo";
  porEstacion: Record<string, number>;
}

const UMBRAL_AMBAR = 0.85;
const UMBRAL_ROJO = 1.0;

function estadoDeUtilizacion(utilizacion: number): "normal" | "ambar" | "rojo" {
  if (utilizacion > UMBRAL_ROJO) return "rojo";
  if (utilizacion > UMBRAL_AMBAR) return "ambar";
  return "normal";
}

export function calcularCargaCocina(
  demanda: DemandaProductoDia[],
  capacidadMinutosDia: number
): CargaDia[] {
  const porFecha = new Map<string, DemandaProductoDia[]>();
  for (const d of demanda) {
    const lista = porFecha.get(d.fecha) ?? [];
    lista.push(d);
    porFecha.set(d.fecha, lista);
  }

  return Array.from(porFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, items]) => {
      const cargaMinutos = items.reduce(
        (acc, i) => acc + i.cantidadPronosticada * i.tiempoPreparacionMin,
        0
      );
      const porEstacion: Record<string, number> = {};
      for (const item of items) {
        if (!item.estacion) continue;
        porEstacion[item.estacion] =
          (porEstacion[item.estacion] ?? 0) +
          item.cantidadPronosticada * item.tiempoPreparacionMin;
      }
      const utilizacion = capacidadMinutosDia > 0 ? cargaMinutos / capacidadMinutosDia : 0;
      return {
        fecha,
        cargaMinutos,
        utilizacion,
        estado: estadoDeUtilizacion(utilizacion),
        porEstacion,
      };
    });
}
