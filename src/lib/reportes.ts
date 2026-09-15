import "server-only";
import { prisma } from "@/lib/prisma";
import { toFechaCalendario, fechaLocalAhora } from "@/lib/fechas";
import { calcularCostoTeoricoPorProducto } from "@/lib/costeoActual";
import { sumarDiasStr } from "@/lib/planificacionConstantes";
import { obtenerParametros } from "@/lib/parametros";

export interface DatosMenuProducto {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  unidadesVendidas: number;
  precioPromedioNeto: number;
  costoTeorico: number;
}

/**
 * Datos base para menu engineering (§6.9) y el ranking de productos: unidades
 * vendidas y precio promedio del período, más el costo teórico vigente.
 */
export async function obtenerDatosMenuProductos(dias = 30): Promise<DatosMenuProducto[]> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -dias);

  const [{ ivaPct, preciosIncluyenIva }, productos, costoTeoricoPorProducto, lineas] = await Promise.all([
    obtenerParametros(),
    prisma.producto.findMany({ where: { activo: true } }),
    calcularCostoTeoricoPorProducto(),
    prisma.ventaLinea.findMany({
      where: {
        venta: {
          fecha: {
            gte: new Date(`${inicio}T00:00:00Z`),
            lt: new Date(`${hoy}T00:00:00Z`),
          },
        },
      },
      select: { productoId: true, cantidad: true, precioUnitario: true },
    }),
  ]);

  const acumulado = new Map<number, { unidades: number; ingresoBruto: number }>();
  for (const l of lineas) {
    const cantidad = Number(l.cantidad);
    const actual = acumulado.get(l.productoId) ?? { unidades: 0, ingresoBruto: 0 };
    actual.unidades += cantidad;
    actual.ingresoBruto += cantidad * Number(l.precioUnitario);
    acumulado.set(l.productoId, actual);
  }

  return productos
    .map((p) => {
      const a = acumulado.get(p.id);
      const unidadesVendidas = a?.unidades ?? 0;
      const precioPromedioBruto = unidadesVendidas > 0 ? a!.ingresoBruto / unidadesVendidas : Number(p.precioVenta);
      const precioPromedioNeto = preciosIncluyenIva
        ? precioPromedioBruto / (1 + ivaPct)
        : precioPromedioBruto;
      return {
        productoId: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        unidadesVendidas,
        precioPromedioNeto,
        costoTeorico: costoTeoricoPorProducto.get(p.id) ?? 0,
      };
    })
    .filter((p) => p.unidadesVendidas > 0);
}

export interface FilaGastoCompras {
  mes: string;
  proveedor: string;
  categoriaInsumo: string;
  total: number;
}

/**
 * Gasto en compras recibidas por mes, proveedor y categoría de insumo.
 */
export async function obtenerGastoCompras(meses = 6): Promise<FilaGastoCompras[]> {
  const hoy = fechaLocalAhora();
  const inicio = `${sumarDiasStr(hoy, -meses * 31).slice(0, 7)}-01`;

  const lineas = await prisma.compraLinea.findMany({
    where: {
      compra: {
        estado: "recibida",
        fechaRecepcion: { gte: new Date(`${inicio}T00:00:00Z`) },
      },
    },
    include: {
      compra: { select: { fechaRecepcion: true, proveedor: { select: { nombre: true } } } },
      insumo: { select: { categoria: true } },
    },
  });

  const acumulado = new Map<string, number>();
  for (const l of lineas) {
    const mes = toFechaCalendario(l.compra.fechaRecepcion!).slice(0, 7);
    const clave = `${mes}|${l.compra.proveedor.nombre}|${l.insumo.categoria}`;
    const total = Number(l.cantidadCompra) * Number(l.precioUnitarioCompra);
    acumulado.set(clave, (acumulado.get(clave) ?? 0) + total);
  }

  return Array.from(acumulado.entries()).map(([clave, total]) => {
    const [mes, proveedor, categoriaInsumo] = clave.split("|");
    return { mes, proveedor, categoriaInsumo, total };
  });
}

export interface CoberturaMes {
  mes: string;
  diasOperativos: number;
  diasRegistrados: number;
  cobertura: number;
}

/**
 * Cobertura de registro de ventas por mes: % de días operativos que
 * efectivamente tienen ventas cargadas. Sirve para auditar la disciplina
 * de carga del cierre de día (§7.6, §8).
 */
export async function obtenerCoberturaPorMes(meses = 6): Promise<CoberturaMes[]> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -meses * 31);

  const [{ diasOperacionSemana }, ventas, diasCierre] = await Promise.all([
    obtenerParametros(),
    prisma.venta.findMany({
      where: { fecha: { gte: new Date(`${inicio}T00:00:00Z`) } },
      select: { fecha: true },
    }),
    prisma.diaCierre.findMany({
      where: { fecha: { gte: new Date(`${inicio}T00:00:00Z`) } },
      select: { fecha: true },
    }),
  ]);

  const fechasRegistradas = new Set(ventas.map((v) => toFechaCalendario(v.fecha)));
  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  const porMes = new Map<string, { diasOperativos: number; diasRegistrados: number }>();
  for (let f = inicio; f < hoy; f = sumarDiasStr(f, 1)) {
    const dow = new Date(`${f}T00:00:00Z`).getUTCDay();
    if (!diasOperacionSemana.includes(dow) || fechasCierre.has(f)) continue;
    const mes = f.slice(0, 7);
    const actual = porMes.get(mes) ?? { diasOperativos: 0, diasRegistrados: 0 };
    actual.diasOperativos += 1;
    if (fechasRegistradas.has(f)) actual.diasRegistrados += 1;
    porMes.set(mes, actual);
  }

  return Array.from(porMes.entries())
    .map(([mes, d]) => ({
      mes,
      diasOperativos: d.diasOperativos,
      diasRegistrados: d.diasRegistrados,
      cobertura: d.diasOperativos > 0 ? d.diasRegistrados / d.diasOperativos : 0,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

export interface SerieCostoInsumo {
  insumoId: number;
  nombre: string;
  unidadBase: string;
  puntos: { fecha: string; costoMedio: number }[];
}

/**
 * Evolución diaria del costo medio de cada insumo (fin de día), con
 * forward-fill entre eventos — el costo medio se mantiene constante hasta la
 * siguiente compra. Leída directamente del ledger; detecta alzas de
 * proveedores (§7.8).
 */
export async function obtenerEvolucionCostoInsumos(dias = 90): Promise<SerieCostoInsumo[]> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -dias);
  const inicioDate = new Date(`${inicio}T00:00:00Z`);

  const [insumos, movimientos, previos] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, unidadBase: true, costoInicial: true },
    }),
    prisma.movimientoInventario.findMany({
      where: { fecha: { gte: inicioDate } },
      orderBy: [{ fecha: "asc" }, { secuencia: "asc" }, { id: "asc" }],
      select: { insumoId: true, fecha: true, costoMedioResultante: true },
    }),
    prisma.movimientoInventario.findMany({
      where: { fecha: { lt: inicioDate } },
      orderBy: [{ fecha: "desc" }, { secuencia: "desc" }, { id: "desc" }],
      distinct: ["insumoId"],
      select: { insumoId: true, costoMedioResultante: true },
    }),
  ]);

  const eventosPorInsumo = new Map<number, Map<string, number>>();
  for (const m of movimientos) {
    const mapa = eventosPorInsumo.get(m.insumoId) ?? new Map<string, number>();
    mapa.set(toFechaCalendario(m.fecha), Number(m.costoMedioResultante));
    eventosPorInsumo.set(m.insumoId, mapa);
  }
  const costoPrevioPorInsumo = new Map(previos.map((p) => [p.insumoId, Number(p.costoMedioResultante)]));

  const dias_: string[] = [];
  for (let f = inicio; f <= hoy; f = sumarDiasStr(f, 1)) dias_.push(f);

  return insumos.map((i) => {
    let actual = costoPrevioPorInsumo.get(i.id) ?? Number(i.costoInicial);
    const eventos = eventosPorInsumo.get(i.id);
    const puntos = dias_.map((fecha) => {
      if (eventos?.has(fecha)) actual = eventos.get(fecha)!;
      return { fecha, costoMedio: actual };
    });
    return { insumoId: i.id, nombre: i.nombre, unidadBase: i.unidadBase, puntos };
  });
}

export interface FilaMerma {
  insumoId: number;
  nombre: string;
  unidadBase: string;
  consumoTeorico: number;
  ajusteAcumulado: number;
  pctSobreConsumo: number;
}

/**
 * Consumo teórico (por receta) vs ajustes de inventario acumulados por
 * insumo: la brecha es el indicador de merma real no contabilizada, robo o
 * error de porcionamiento. §7.8 — "de alto valor y suele omitirse".
 */
export async function obtenerConsumoTeoricoVsAjustes(dias = 90): Promise<FilaMerma[]> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -dias);

  const [insumos, movimientos] = await Promise.all([
    prisma.insumo.findMany({ select: { id: true, nombre: true, unidadBase: true } }),
    prisma.movimientoInventario.findMany({
      where: {
        fecha: { gte: new Date(`${inicio}T00:00:00Z`) },
        tipo: { in: ["consumo_venta", "ajuste"] },
      },
      select: { insumoId: true, tipo: true, cantidad: true },
    }),
  ]);

  const acumulado = new Map<number, { consumoTeorico: number; ajusteAcumulado: number }>();
  for (const m of movimientos) {
    const actual = acumulado.get(m.insumoId) ?? { consumoTeorico: 0, ajusteAcumulado: 0 };
    if (m.tipo === "consumo_venta") actual.consumoTeorico += Math.abs(Number(m.cantidad));
    else actual.ajusteAcumulado += Number(m.cantidad);
    acumulado.set(m.insumoId, actual);
  }

  return insumos
    .map((i) => {
      const a = acumulado.get(i.id);
      const consumoTeorico = a?.consumoTeorico ?? 0;
      const ajusteAcumulado = a?.ajusteAcumulado ?? 0;
      return {
        insumoId: i.id,
        nombre: i.nombre,
        unidadBase: i.unidadBase,
        consumoTeorico,
        ajusteAcumulado,
        pctSobreConsumo: consumoTeorico > 0 ? ajusteAcumulado / consumoTeorico : 0,
      };
    })
    .filter((f) => f.consumoTeorico > 0 || f.ajusteAcumulado !== 0);
}

export interface SemanaMix {
  semanaInicio: string;
  comida: { unidades: number; ingreso: number; margen: number };
  bebida: { unidades: number; ingreso: number; margen: number };
}

/**
 * Evolución semanal del mix comida/bebida (ingreso y margen), usando el
 * costo teórico vigente como aproximación del costo histórico — igual
 * criterio que el historial de ventas (§7.8).
 */
export async function obtenerMixEvolucion(semanas = 12): Promise<SemanaMix[]> {
  const hoy = fechaLocalAhora();
  const inicio = sumarDiasStr(hoy, -semanas * 7);

  const [costoTeoricoPorProducto, ventas] = await Promise.all([
    calcularCostoTeoricoPorProducto(),
    prisma.venta.findMany({
      where: { fecha: { gte: new Date(`${inicio}T00:00:00Z`) } },
      include: { lineas: { include: { producto: { select: { categoria: true } } } } },
    }),
  ]);

  const semanasArr: SemanaMix[] = [];
  for (let i = 0; i < semanas; i++) {
    const semanaInicio = sumarDiasStr(inicio, i * 7);
    semanasArr.push({
      semanaInicio,
      comida: { unidades: 0, ingreso: 0, margen: 0 },
      bebida: { unidades: 0, ingreso: 0, margen: 0 },
    });
  }

  for (const v of ventas) {
    const fecha = toFechaCalendario(v.fecha);
    const diasDesdeInicio = Math.floor(
      (new Date(`${fecha}T00:00:00Z`).getTime() - new Date(`${inicio}T00:00:00Z`).getTime()) /
        86400000
    );
    const indiceSemana = Math.floor(diasDesdeInicio / 7);
    if (indiceSemana < 0 || indiceSemana >= semanasArr.length) continue;

    for (const l of v.lineas) {
      const cantidad = Number(l.cantidad);
      const ingreso = cantidad * Number(l.precioUnitario);
      const costo = cantidad * (costoTeoricoPorProducto.get(l.productoId) ?? 0);
      const bucket =
        l.producto.categoria === "bebida"
          ? semanasArr[indiceSemana].bebida
          : semanasArr[indiceSemana].comida;
      bucket.unidades += cantidad;
      bucket.ingreso += ingreso;
      bucket.margen += ingreso - costo;
    }
  }

  return semanasArr;
}
