// Especificación §6.7 — MRP: requerimientos y sugerencia de compra.

export interface EntradaProgramada {
  fecha: string;
  cantidadBase: number;
}

export interface RequerimientoDia {
  fecha: string;
  /** Requerimiento bruto: explosión del pronóstico contra la BOM, con merma. */
  requerimiento: number;
}

export interface ParametrosMrpInsumo {
  insumoId: number;
  stockActual: number;
  stockSeguridad: number;
  leadTimeDias: number;
  loteMinimoCompra: number;
  factorConversion: number;
  costoMedio: number;
  /** Requerimiento bruto por día del horizonte, en orden cronológico. */
  requerimientos: RequerimientoDia[];
  /** Compras pendientes con fecha esperada dentro del horizonte. */
  entradasProgramadas: EntradaProgramada[];
  /** Fecha de "hoy", para determinar urgencia. */
  hoy: string;
}

export interface PuntoDisponibilidad {
  fecha: string;
  disponibilidad: number;
}

export interface SugerenciaCompra {
  insumoId: number;
  cubierto: boolean;
  fechaQuiebre: string | null;
  fechaPedido: string | null;
  urgente: boolean;
  necesidadNeta: number;
  cantidadEnUnidadCompra: number;
  cantidadFinal: number;
  costoEstimado: number;
  coberturaDias: number;
  disponibilidadProyectada: PuntoDisponibilidad[];
}

function sumar(numeros: number[]): number {
  return numeros.reduce((a, b) => a + b, 0);
}

function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function calcularSugerenciaCompra(
  params: ParametrosMrpInsumo
): SugerenciaCompra {
  const {
    insumoId,
    stockActual,
    stockSeguridad,
    leadTimeDias,
    loteMinimoCompra,
    factorConversion,
    costoMedio,
    requerimientos,
    entradasProgramadas,
    hoy,
  } = params;

  const entradaPorFecha = new Map<string, number>();
  for (const e of entradasProgramadas) {
    entradaPorFecha.set(e.fecha, (entradaPorFecha.get(e.fecha) ?? 0) + e.cantidadBase);
  }

  const disponibilidadProyectada: PuntoDisponibilidad[] = [];
  let disponibilidad = stockActual;
  let fechaQuiebre: string | null = null;

  for (const r of requerimientos) {
    const entrada = entradaPorFecha.get(r.fecha) ?? 0;
    disponibilidad = disponibilidad + entrada - r.requerimiento;
    disponibilidadProyectada.push({ fecha: r.fecha, disponibilidad });
    if (fechaQuiebre === null && disponibilidad < stockSeguridad) {
      fechaQuiebre = r.fecha;
    }
  }

  const cubierto = fechaQuiebre === null;
  const fechaPedido = fechaQuiebre ? restarDias(fechaQuiebre, leadTimeDias) : null;
  const urgente = fechaPedido !== null && fechaPedido <= hoy;

  const requerimientoTotalHorizonte = sumar(requerimientos.map((r) => r.requerimiento));
  const entradaTotalHorizonte = sumar(
    requerimientos.map((r) => entradaPorFecha.get(r.fecha) ?? 0)
  );
  const necesidadNeta =
    requerimientoTotalHorizonte + stockSeguridad - stockActual - entradaTotalHorizonte;

  const cantidadEnUnidadCompra =
    necesidadNeta > 0 ? Math.ceil(necesidadNeta / factorConversion) : 0;
  const cantidadFinal =
    necesidadNeta > 0 ? Math.max(cantidadEnUnidadCompra, loteMinimoCompra) : 0;
  const costoEstimado = cantidadFinal * costoMedio * factorConversion;

  const horizonteDias = requerimientos.length;
  const consumoPromedioDiario =
    horizonteDias > 0 ? requerimientoTotalHorizonte / horizonteDias : 0;
  const coberturaDias =
    consumoPromedioDiario > 0
      ? stockActual / consumoPromedioDiario
      : Number.POSITIVE_INFINITY;

  return {
    insumoId,
    cubierto,
    fechaQuiebre,
    fechaPedido,
    urgente,
    necesidadNeta: Math.max(0, necesidadNeta),
    cantidadEnUnidadCompra,
    cantidadFinal,
    costoEstimado,
    coberturaDias,
    disponibilidadProyectada,
  };
}
