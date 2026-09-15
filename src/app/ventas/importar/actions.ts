"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { recalcularInventarioCompleto } from "@/lib/inventario";
import { obtenerUsuarioActualId } from "@/lib/usuarioActual";
import { toFechaCalendario } from "@/lib/fechas";
import { CANALES_VENTA } from "@/lib/validaciones/venta";

export interface FilaCsvVenta {
  fecha: string;
  codigoProducto: string;
  cantidad: string;
  precioUnitario: string;
  canal: string;
}

export interface ErrorFilaCsv {
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacionCsv {
  totalFilas: number;
  filasValidas: number;
  errores: ErrorFilaCsv[];
  diasImportados: number;
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function importarVentasCsv(
  filas: FilaCsvVenta[]
): Promise<ResultadoImportacionCsv> {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true },
  });
  const idPorCodigo = new Map(productos.map((p) => [p.codigo, p.id]));

  const diasCierre = await prisma.diaCierre.findMany({ select: { fecha: true } });
  const fechasCierre = new Set(diasCierre.map((d) => toFechaCalendario(d.fecha)));

  const errores: ErrorFilaCsv[] = [];
  interface FilaValida {
    fecha: string;
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    canal: (typeof CANALES_VENTA)[number];
  }
  const validas: FilaValida[] = [];

  filas.forEach((f, i) => {
    const numeroFila = i + 2; // +1 por índice base 0, +1 por la fila de encabezado
    if (!RE_FECHA.test(f.fecha)) {
      errores.push({ fila: numeroFila, mensaje: `Fecha inválida: "${f.fecha}"` });
      return;
    }
    if (fechasCierre.has(f.fecha)) {
      errores.push({ fila: numeroFila, mensaje: `${f.fecha} está marcado como día de cierre` });
      return;
    }
    const productoId = idPorCodigo.get(f.codigoProducto);
    if (!productoId) {
      errores.push({
        fila: numeroFila,
        mensaje: `Producto inexistente: "${f.codigoProducto}"`,
      });
      return;
    }
    const cantidad = Number(f.cantidad);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      errores.push({ fila: numeroFila, mensaje: `Cantidad no numérica: "${f.cantidad}"` });
      return;
    }
    const precioUnitario = Number(f.precioUnitario);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      errores.push({
        fila: numeroFila,
        mensaje: `Precio unitario no numérico: "${f.precioUnitario}"`,
      });
      return;
    }
    if (!CANALES_VENTA.includes(f.canal as (typeof CANALES_VENTA)[number])) {
      errores.push({ fila: numeroFila, mensaje: `Canal desconocido: "${f.canal}"` });
      return;
    }

    validas.push({
      fecha: f.fecha,
      productoId,
      cantidad,
      precioUnitario,
      canal: f.canal as (typeof CANALES_VENTA)[number],
    });
  });

  const grupos = new Map<string, FilaValida[]>();
  for (const fila of validas) {
    const clave = `${fila.fecha}|${fila.canal}`;
    const lista = grupos.get(clave) ?? [];
    lista.push(fila);
    grupos.set(clave, lista);
  }

  if (grupos.size > 0) {
    const usuarioId = await obtenerUsuarioActualId();

    await prisma.$transaction(async (tx) => {
      for (const [, filasGrupo] of grupos) {
        const { fecha, canal } = filasGrupo[0];

        let venta = await tx.venta.findFirst({ where: { fecha: new Date(fecha), canal } });
        if (!venta) {
          venta = await tx.venta.create({
            data: { fecha: new Date(fecha), canal, origen: "csv", creadoPor: usuarioId },
          });
        }

        const porProducto = new Map<number, { cantidad: number; precioUnitario: number }>();
        for (const f of filasGrupo) {
          const actual = porProducto.get(f.productoId);
          porProducto.set(f.productoId, {
            cantidad: (actual?.cantidad ?? 0) + f.cantidad,
            precioUnitario: f.precioUnitario,
          });
        }

        for (const [productoId, valores] of porProducto) {
          const lineaExistente = await tx.ventaLinea.findFirst({
            where: { ventaId: venta.id, productoId },
          });
          if (lineaExistente) {
            await tx.ventaLinea.update({
              where: { id: lineaExistente.id },
              data: valores,
            });
          } else {
            await tx.ventaLinea.create({
              data: { ventaId: venta.id, productoId, ...valores },
            });
          }
        }
      }
    });

    await recalcularInventarioCompleto();

    revalidatePath("/ventas");
    revalidatePath("/ventas/historial");
    revalidatePath("/insumos");
    revalidatePath("/inventario");
  }

  return {
    totalFilas: filas.length,
    filasValidas: validas.length,
    errores,
    diasImportados: grupos.size,
  };
}
