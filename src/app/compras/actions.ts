"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { compraFormSchema, type CompraFormValues } from "@/lib/validaciones/compra";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";

export interface ResultadoAccionCompra {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  compraId?: number;
}

async function generarFolio(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `OC-${anio}-`;
  const cantidad = await prisma.compra.count({
    where: { folio: { startsWith: prefijo } },
  });
  return `${prefijo}${String(cantidad + 1).padStart(4, "0")}`;
}

function validarLineasUnicas(lineas: CompraFormValues["lineas"]): boolean {
  const ids = lineas.map((l) => l.insumoId);
  return new Set(ids).size === ids.length;
}

export async function crearCompra(
  datos: CompraFormValues
): Promise<ResultadoAccionCompra> {
  const parsed = compraFormSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }
  if (!validarLineasUnicas(parsed.data.lineas)) {
    return { ok: false, mensaje: "Un insumo no puede repetirse en la misma orden." };
  }

  const usuarioId = await obtenerUsuarioActualId();
  const folio = await generarFolio();

  const compra = await prisma.compra.create({
    data: {
      folio,
      proveedorId: parsed.data.proveedorId,
      fechaEmision: new Date(parsed.data.fechaEmision),
      fechaEsperada: new Date(parsed.data.fechaEsperada),
      documento: parsed.data.documento || null,
      nota: parsed.data.nota || null,
      creadoPor: usuarioId,
      lineas: {
        create: parsed.data.lineas.map((l) => ({
          insumoId: l.insumoId,
          cantidadCompra: l.cantidadCompra,
          precioUnitarioCompra: l.precioUnitarioCompra,
        })),
      },
    },
  });

  revalidatePath("/compras");
  return { ok: true, compraId: compra.id };
}

export async function actualizarCompra(
  compraId: number,
  datos: CompraFormValues
): Promise<ResultadoAccionCompra> {
  const parsed = compraFormSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }
  if (!validarLineasUnicas(parsed.data.lineas)) {
    return { ok: false, mensaje: "Un insumo no puede repetirse en la misma orden." };
  }

  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) return { ok: false, mensaje: "La orden ya no existe." };
  if (compra.estado !== "borrador") {
    return { ok: false, mensaje: "Solo se puede editar una orden en borrador." };
  }

  const usuarioId = await obtenerUsuarioActualId();

  await prisma.$transaction([
    prisma.compraLinea.deleteMany({ where: { compraId } }),
    prisma.compra.update({
      where: { id: compraId },
      data: {
        proveedorId: parsed.data.proveedorId,
        fechaEmision: new Date(parsed.data.fechaEmision),
        fechaEsperada: new Date(parsed.data.fechaEsperada),
        documento: parsed.data.documento || null,
        nota: parsed.data.nota || null,
        actualizadoPor: usuarioId,
        lineas: {
          create: parsed.data.lineas.map((l) => ({
            insumoId: l.insumoId,
            cantidadCompra: l.cantidadCompra,
            precioUnitarioCompra: l.precioUnitarioCompra,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/compras");
  revalidatePath(`/compras/${compraId}`);
  return { ok: true, compraId };
}

export async function enviarCompra(compraId: number): Promise<ResultadoAccionCompra> {
  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) return { ok: false, mensaje: "La orden ya no existe." };
  if (compra.estado !== "borrador") {
    return { ok: false, mensaje: "Solo una orden en borrador se puede enviar." };
  }

  await prisma.compra.update({ where: { id: compraId }, data: { estado: "pendiente" } });
  revalidatePath("/compras");
  revalidatePath(`/compras/${compraId}`);
  return { ok: true };
}

export async function anularCompra(
  compraId: number,
  motivo: string
): Promise<ResultadoAccionCompra> {
  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) return { ok: false, mensaje: "La orden ya no existe." };
  if (compra.estado === "anulada") return { ok: true };

  await prisma.compra.update({
    where: { id: compraId },
    data: { estado: "anulada", anulado: true, anuladoMotivo: motivo || null },
  });

  // Si ya estaba recibida, sus movimientos deben desaparecer del ledger.
  if (compra.estado === "recibida") {
    await recalcularInventarioCompleto();
  }

  revalidatePath("/compras");
  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/insumos");
  revalidatePath("/inventario");
  return { ok: true };
}

export interface LineaRecepcionInput {
  compraLineaId: number;
  cantidadRecibida: number;
  precioUnitarioCompra: number;
}

export async function recibirCompra(
  compraId: number,
  fechaRecepcion: string,
  lineas: LineaRecepcionInput[]
): Promise<ResultadoAccionCompra> {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { lineas: true },
  });
  if (!compra) return { ok: false, mensaje: "La orden ya no existe." };
  if (compra.estado !== "pendiente") {
    return { ok: false, mensaje: "Solo se puede recibir una orden pendiente." };
  }
  if (!fechaRecepcion) return { ok: false, mensaje: "Indica la fecha de recepción." };

  const idsValidos = new Set(compra.lineas.map((l) => l.id));
  for (const l of lineas) {
    if (!idsValidos.has(l.compraLineaId)) {
      return { ok: false, mensaje: "Línea de recepción inválida." };
    }
    if (l.cantidadRecibida < 0 || l.precioUnitarioCompra < 0) {
      return { ok: false, mensaje: "Las cantidades y precios no pueden ser negativos." };
    }
  }

  const usuarioId = await obtenerUsuarioActualId();

  await prisma.$transaction([
    ...lineas.map((l) =>
      prisma.compraLinea.update({
        where: { id: l.compraLineaId },
        data: {
          cantidadRecibidaCompra: l.cantidadRecibida,
          precioUnitarioCompra: l.precioUnitarioCompra,
        },
      })
    ),
    prisma.compra.update({
      where: { id: compraId },
      data: {
        estado: "recibida",
        fechaRecepcion: new Date(fechaRecepcion),
        actualizadoPor: usuarioId,
      },
    }),
  ]);

  await recalcularInventarioCompleto();

  revalidatePath("/compras");
  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/insumos");
  revalidatePath("/inventario");
  revalidatePath("/recetas");
  return { ok: true };
}
