import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { ErrorCampo } from "@/lib/apiAuth";
import type { InsumoFormValues } from "@/lib/validaciones/insumo";

export type EstadoInsumo = "verde" | "ambar" | "negro";

export interface InsumoParaEditar {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadBase: string;
  unidadCompra: string;
  factorConversion: string;
  mermaPct: string;
  stockSeguridad: string;
  loteMinimoCompra: string;
  leadTimeDias: number;
  proveedorId: number | null;
  perecible: boolean;
  stockInicial: string;
  costoInicial: string;
  tieneMovimientos: boolean;
}

export interface FilaInsumo {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadBase: "g" | "ml" | "un";
  unidadCompra: string;
  stockActual: number;
  stockSeguridad: number;
  costoMedio: number;
  valorBodega: number;
  proveedorId: number | null;
  proveedorNombre: string | null;
  estado: EstadoInsumo;
  activo: boolean;
  form: InsumoParaEditar;
}

function calcularEstado(stockActual: number, stockSeguridad: number): EstadoInsumo {
  if (stockActual < 0) return "negro";
  if (stockActual < stockSeguridad) return "ambar";
  return "verde";
}

export async function listarInsumosConEstado(): Promise<FilaInsumo[]> {
  const [insumos, estadoPorInsumo] = await Promise.all([
    prisma.insumo.findMany({
      include: {
        proveedor: { select: { id: true, nombre: true } },
        _count: { select: { movimientosInventario: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    obtenerEstadoInsumos(),
  ]);

  return insumos.map((i) => {
    const estado = estadoPorInsumo.get(i.id);
    const stockActual = estado?.stock ?? Number(i.stockInicial);
    const stockSeguridad = Number(i.stockSeguridad);
    const costoMedio = estado?.costoMedio ?? Number(i.costoInicial);

    return {
      id: i.id,
      codigo: i.codigo,
      nombre: i.nombre,
      categoria: i.categoria,
      unidadBase: i.unidadBase,
      unidadCompra: i.unidadCompra,
      stockActual,
      stockSeguridad,
      costoMedio,
      valorBodega: stockActual * costoMedio,
      proveedorId: i.proveedorId,
      proveedorNombre: i.proveedor?.nombre ?? null,
      estado: calcularEstado(stockActual, stockSeguridad),
      activo: i.activo,
      form: {
        id: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        categoria: i.categoria,
        unidadBase: i.unidadBase,
        unidadCompra: i.unidadCompra,
        factorConversion: i.factorConversion.toString(),
        mermaPct: i.mermaPct.toString(),
        stockSeguridad: i.stockSeguridad.toString(),
        loteMinimoCompra: i.loteMinimoCompra.toString(),
        leadTimeDias: i.leadTimeDias,
        proveedorId: i.proveedorId,
        perecible: i.perecible,
        stockInicial: i.stockInicial.toString(),
        costoInicial: i.costoInicial.toString(),
        tieneMovimientos: i._count.movimientosInventario > 0,
      },
    };
  });
}

export async function crearInsumo(datos: InsumoFormValues) {
  const { mermaPorcentaje, ...resto } = datos;
  try {
    return await prisma.insumo.create({
      data: { ...resto, mermaPct: mermaPorcentaje / 100 },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErrorCampo("codigo", "Ya existe un insumo con ese código.");
    }
    throw err;
  }
}

export async function actualizarInsumo(insumoId: number, datos: InsumoFormValues) {
  const { mermaPorcentaje, unidadBase, ...resto } = datos;

  const existente = await prisma.insumo.findUnique({
    where: { id: insumoId },
    select: { unidadBase: true, _count: { select: { movimientosInventario: true } } },
  });
  if (!existente) throw new ErrorCampo("nombre", "El insumo ya no existe.");

  const tieneMovimientos = existente._count.movimientosInventario > 0;
  if (tieneMovimientos && unidadBase !== existente.unidadBase) {
    throw new ErrorCampo(
      "unidadBase",
      "No se puede cambiar la unidad base: el insumo ya tiene movimientos."
    );
  }

  try {
    return await prisma.insumo.update({
      where: { id: insumoId },
      data: { ...resto, unidadBase, mermaPct: mermaPorcentaje / 100 },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErrorCampo("codigo", "Ya existe un insumo con ese código.");
    }
    throw err;
  }
}

export async function cambiarEstadoInsumo(insumoId: number, activo: boolean) {
  return prisma.insumo.update({ where: { id: insumoId }, data: { activo } });
}
