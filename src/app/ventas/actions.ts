"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { cierreDiaSchema, type CierreDiaValues } from "@/lib/validaciones/venta";

export interface ResumenCategoria {
  unidades: number;
  ingreso: number;
  costo: number;
  margen: number;
}

export interface AlertaStock {
  insumoId: number;
  nombre: string;
  stock: number;
  stockSeguridad: number;
  unidadBase: string;
}

export interface ResumenCierreDia {
  ingreso: number;
  costo: number;
  margen: number;
  comida: ResumenCategoria;
  bebida: ResumenCategoria;
  alertas: AlertaStock[];
}

export interface ResultadoCierreDia {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  resumen?: ResumenCierreDia;
}

function resumenVacio(): ResumenCategoria {
  return { unidades: 0, ingreso: 0, costo: 0, margen: 0 };
}

export async function guardarCierreDia(
  datos: CierreDiaValues
): Promise<ResultadoCierreDia> {
  const parsed = cierreDiaSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }
  const { fecha, canal, lineas } = parsed.data;

  const cierre = await prisma.diaCierre.findUnique({ where: { fecha: new Date(fecha) } });
  if (cierre) {
    return {
      ok: false,
      mensaje: "Este día está marcado como cierre. Reábrelo antes de registrar ventas.",
    };
  }

  const usuarioId = await obtenerUsuarioActualId();

  const existente = await prisma.venta.findFirst({
    where: { fecha: new Date(fecha), canal },
  });

  await prisma.$transaction(async (tx) => {
    let ventaId: number;
    if (existente) {
      ventaId = existente.id;
      await tx.ventaLinea.deleteMany({ where: { ventaId } });
    } else {
      const venta = await tx.venta.create({
        data: { fecha: new Date(fecha), canal, origen: "manual", creadoPor: usuarioId },
      });
      ventaId = venta.id;
    }
    await tx.ventaLinea.createMany({
      data: lineas.map((l) => ({
        ventaId,
        productoId: l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
    });
  });

  const resultadoLedger = await recalcularInventarioCompleto();

  const productos = await prisma.producto.findMany({
    where: { id: { in: lineas.map((l) => l.productoId) } },
    select: { id: true, categoria: true },
  });
  const categoriaPorProducto = new Map(productos.map((p) => [p.id, p.categoria]));

  const cogsPorProducto = new Map(
    resultadoLedger.cogsPorDiaProducto
      .filter((c) => c.fecha === fecha)
      .map((c) => [c.productoId, c.cogs])
  );

  const comida = resumenVacio();
  const bebida = resumenVacio();

  for (const l of lineas) {
    const categoria = categoriaPorProducto.get(l.productoId);
    const bucket = categoria === "bebida" ? bebida : comida;
    const ingresoLinea = l.cantidad * l.precioUnitario;
    const costoLinea = cogsPorProducto.get(l.productoId) ?? 0;
    bucket.unidades += l.cantidad;
    bucket.ingreso += ingresoLinea;
    bucket.costo += costoLinea;
    bucket.margen += ingresoLinea - costoLinea;
  }

  const insumosTocados = new Set(
    resultadoLedger.movimientos
      .filter((m) => m.fecha === fecha && m.tipo === "consumo_venta")
      .map((m) => m.insumoId)
  );
  const insumosInfo =
    insumosTocados.size > 0
      ? await prisma.insumo.findMany({
          where: { id: { in: Array.from(insumosTocados) } },
          select: { id: true, nombre: true, stockSeguridad: true, unidadBase: true },
        })
      : [];
  const alertas: AlertaStock[] = insumosInfo
    .map((i) => ({
      insumoId: i.id,
      nombre: i.nombre,
      stock: resultadoLedger.stockFinal[i.id] ?? 0,
      stockSeguridad: Number(i.stockSeguridad),
      unidadBase: i.unidadBase,
    }))
    .filter((a) => a.stock < a.stockSeguridad);

  revalidatePath("/ventas");
  revalidatePath("/ventas/historial");
  revalidatePath("/insumos");
  revalidatePath("/inventario");

  return {
    ok: true,
    resumen: {
      ingreso: comida.ingreso + bebida.ingreso,
      costo: comida.costo + bebida.costo,
      margen: comida.margen + bebida.margen,
      comida,
      bebida,
      alertas,
    },
  };
}

export async function marcarDiaSinOperacion(
  fecha: string,
  motivo: string
): Promise<{ ok: boolean; mensaje?: string }> {
  const ventaExistente = await prisma.venta.findFirst({ where: { fecha: new Date(fecha) } });
  if (ventaExistente) {
    return {
      ok: false,
      mensaje: "Ya hay ventas registradas ese día; no se puede marcar como cierre.",
    };
  }

  const usuarioId = await obtenerUsuarioActualId();
  await prisma.diaCierre.upsert({
    where: { fecha: new Date(fecha) },
    update: { motivo: motivo || null, usuarioId },
    create: { fecha: new Date(fecha), motivo: motivo || null, usuarioId },
  });

  revalidatePath("/ventas");
  revalidatePath("/ventas/historial");
  return { ok: true };
}

export async function reabrirDia(fecha: string): Promise<void> {
  await prisma.diaCierre.deleteMany({ where: { fecha: new Date(fecha) } });
  revalidatePath("/ventas");
  revalidatePath("/ventas/historial");
}
