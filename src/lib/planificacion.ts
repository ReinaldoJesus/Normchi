import "server-only";
import { prisma } from "@/lib/prisma";
import { toFechaCalendario, fechaLocalAhora } from "@/lib/fechas";
import type { DiaHistorico } from "@/lib/motor/pronostico";
import { sumarDiasStr } from "@/lib/planificacionConstantes";

export interface ProductoPlanificable {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  tiempoPreparacionMin: number;
  estacion: string | null;
}

export interface DatosHistoricos {
  productos: ProductoPlanificable[];
  seriesPorProducto: Map<number, DiaHistorico[]>;
}

/**
 * Construye, para cada producto activo, la serie diaria de los últimos
 * `ventanaDias` (hasta ayer inclusive — hoy todavía no está "cerrado").
 * Distingue día operado+registrado sin venta (u_t=0), día no operado
 * (excluido) y día operado sin registrar (excluido, cuenta como brecha).
 * Ver especificación §6.6 paso 1.
 */
export async function construirSeriesHistoricas(
  diasOperacionSemana: number[],
  ventanaDias: number
): Promise<DatosHistoricos> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -ventanaDias);

  const [productos, ventas, diasCierre] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.venta.findMany({
      where: {
        fecha: {
          gte: new Date(`${inicio}T00:00:00Z`),
          lt: new Date(`${hoy}T00:00:00Z`),
        },
      },
      include: { lineas: true },
    }),
    prisma.diaCierre.findMany({
      where: {
        fecha: {
          gte: new Date(`${inicio}T00:00:00Z`),
          lt: new Date(`${hoy}T00:00:00Z`),
        },
      },
    }),
  ]);

  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  const ventaPorFecha = new Map<string, Map<number, number>>();
  for (const v of ventas) {
    const fecha = toFechaCalendario(v.fecha);
    const mapa = ventaPorFecha.get(fecha) ?? new Map<number, number>();
    for (const l of v.lineas) {
      mapa.set(l.productoId, (mapa.get(l.productoId) ?? 0) + Number(l.cantidad));
    }
    ventaPorFecha.set(fecha, mapa);
  }

  const dias: { fecha: string; dow: number }[] = [];
  for (let cursor = inicio; cursor < hoy; cursor = sumarDiasStr(cursor, 1)) {
    dias.push({ fecha: cursor, dow: new Date(`${cursor}T00:00:00Z`).getUTCDay() });
  }

  const seriesPorProducto = new Map<number, DiaHistorico[]>();
  for (const p of productos) {
    const serie: DiaHistorico[] = dias.map(({ fecha, dow }) => {
      const operativo = diasOperacionSemana.includes(dow) && !fechasCierre.has(fecha);
      const ventasDia = ventaPorFecha.get(fecha);
      const registrado = ventasDia !== undefined;
      return {
        fecha,
        dow,
        operativo,
        registrado,
        cantidadVendida: registrado ? (ventasDia!.get(p.id) ?? 0) : undefined,
      };
    });
    seriesPorProducto.set(p.id, serie);
  }

  return {
    productos: productos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      tiempoPreparacionMin: Number(p.tiempoPreparacionMin),
      estacion: p.estacion,
    })),
    seriesPorProducto,
  };
}
