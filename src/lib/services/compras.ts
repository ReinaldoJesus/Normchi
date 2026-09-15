import "server-only";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { fechaLocalAhora, toFechaCalendario } from "@/lib/fechas";
import { compraFormSchema, type CompraFormValues } from "@/lib/validaciones/compra";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { ErrorApi, ErrorValidacion } from "@/lib/apiAuth";
import type { EstadoCompra } from "@/generated/prisma";

export interface FilaCompra {
  id: number;
  folio: string;
  proveedorNombre: string;
  fechaEmision: string;
  fechaEsperada: string;
  estado: EstadoCompra;
  total: number;
  vencida: boolean;
}

function calcularTotal(lineas: { cantidadCompra: unknown; precioUnitarioCompra: unknown }[]) {
  return lineas.reduce(
    (acc, l) => acc + Number(l.cantidadCompra) * Number(l.precioUnitarioCompra),
    0
  );
}

async function generarFolio(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `OC-${anio}-`;
  const cantidad = await prisma.compra.count({ where: { folio: { startsWith: prefijo } } });
  return `${prefijo}${String(cantidad + 1).padStart(4, "0")}`;
}

function validarLineasUnicas(lineas: CompraFormValues["lineas"]): boolean {
  const ids = lineas.map((l) => l.insumoId);
  return new Set(ids).size === ids.length;
}

export async function listarCompras(): Promise<FilaCompra[]> {
  const compras = await prisma.compra.findMany({
    include: { proveedor: { select: { nombre: true } }, lineas: true },
    orderBy: { fechaEmision: "desc" },
  });
  const hoy = fechaLocalAhora();

  return compras.map((c) => ({
    id: c.id,
    folio: c.folio,
    proveedorNombre: c.proveedor.nombre,
    fechaEmision: toFechaCalendario(c.fechaEmision),
    fechaEsperada: toFechaCalendario(c.fechaEsperada),
    estado: c.estado,
    total: calcularTotal(c.lineas),
    vencida: c.estado === "pendiente" && toFechaCalendario(c.fechaEsperada) < hoy,
  }));
}

export async function obtenerCompra(compraId: number) {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { proveedor: true, lineas: { include: { insumo: true } } },
  });
  if (!compra) return null;
  return { compra, total: calcularTotal(compra.lineas) };
}

export async function listarInsumosParaCompra() {
  return prisma.insumo.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, unidadCompra: true, proveedorId: true },
  });
}

export async function crearCompra(datos: CompraFormValues) {
  const parsed = compraFormSchema.safeParse(datos);
  if (!parsed.success) {
    throw new ErrorValidacion(parsed.error.flatten().fieldErrors);
  }
  if (!validarLineasUnicas(parsed.data.lineas)) {
    throw new ErrorApi(400, "Un insumo no puede repetirse en la misma orden.");
  }

  const usuarioId = await obtenerUsuarioActualId();
  const folio = await generarFolio();

  return prisma.compra.create({
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
}

export async function actualizarCompra(compraId: number, datos: CompraFormValues) {
  const parsed = compraFormSchema.safeParse(datos);
  if (!parsed.success) {
    throw new ErrorValidacion(parsed.error.flatten().fieldErrors);
  }
  if (!validarLineasUnicas(parsed.data.lineas)) {
    throw new ErrorApi(400, "Un insumo no puede repetirse en la misma orden.");
  }

  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) throw new ErrorApi(404, "La orden ya no existe.");
  if (compra.estado !== "borrador") {
    throw new ErrorApi(400, "Solo se puede editar una orden en borrador.");
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

  return { compraId };
}

export async function enviarCompra(compraId: number) {
  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) throw new ErrorApi(404, "La orden ya no existe.");
  if (compra.estado !== "borrador") {
    throw new ErrorApi(400, "Solo una orden en borrador se puede enviar.");
  }
  await prisma.compra.update({ where: { id: compraId }, data: { estado: "pendiente" } });
}

export async function anularCompra(compraId: number, motivo: string) {
  const compra = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!compra) throw new ErrorApi(404, "La orden ya no existe.");
  if (compra.estado === "anulada") return;

  await prisma.compra.update({
    where: { id: compraId },
    data: { estado: "anulada", anulado: true, anuladoMotivo: motivo || null },
  });

  if (compra.estado === "recibida") {
    await recalcularInventarioCompleto();
  }
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
) {
  const compra = await prisma.compra.findUnique({ where: { id: compraId }, include: { lineas: true } });
  if (!compra) throw new ErrorApi(404, "La orden ya no existe.");
  if (compra.estado !== "pendiente") {
    throw new ErrorApi(400, "Solo se puede recibir una orden pendiente.");
  }
  if (!fechaRecepcion) throw new ErrorApi(400, "Indica la fecha de recepción.");

  const idsValidos = new Set(compra.lineas.map((l) => l.id));
  for (const l of lineas) {
    if (!idsValidos.has(l.compraLineaId)) {
      throw new ErrorApi(400, "Línea de recepción inválida.");
    }
    if (l.cantidadRecibida < 0 || l.precioUnitarioCompra < 0) {
      throw new ErrorApi(400, "Las cantidades y precios no pueden ser negativos.");
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
      data: { estado: "recibida", fechaRecepcion: new Date(fechaRecepcion), actualizadoPor: usuarioId },
    }),
  ]);

  await recalcularInventarioCompleto();
}
