"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { productoFormSchema } from "@/lib/validaciones/producto";

export interface EstadoFormularioProducto {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    subcategoria: formData.get("subcategoria") ?? "",
    precioVenta: formData.get("precioVenta"),
    tiempoPreparacionMin: formData.get("tiempoPreparacionMin"),
    estacion: formData.get("estacion") ?? "",
    esReventa: formData.get("esReventa") ?? undefined,
    espejoUnidadCompra: formData.get("espejoUnidadCompra") ?? undefined,
    espejoFactorConversion: formData.get("espejoFactorConversion") ?? undefined,
    espejoStockInicial: formData.get("espejoStockInicial") ?? undefined,
    espejoCostoInicial: formData.get("espejoCostoInicial") ?? undefined,
  };
}

export async function crearProducto(
  _prev: EstadoFormularioProducto,
  formData: FormData
): Promise<EstadoFormularioProducto> {
  const parsed = productoFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const {
    esReventa,
    espejoUnidadCompra,
    espejoFactorConversion,
    espejoStockInicial,
    espejoCostoInicial,
    subcategoria,
    estacion,
    ...datos
  } = parsed.data;

  if (esReventa && (!espejoUnidadCompra || !espejoFactorConversion)) {
    return {
      ok: false,
      errores: {
        espejoUnidadCompra: !espejoUnidadCompra ? ["Requerido para reventa directa"] : undefined,
        espejoFactorConversion: !espejoFactorConversion
          ? ["Requerido para reventa directa"]
          : undefined,
      },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (esReventa) {
        const insumo = await tx.insumo.create({
          data: {
            codigo: datos.codigo,
            nombre: datos.nombre,
            categoria: datos.categoria === "bebida" ? "Bebidas" : "Comida",
            unidadBase: "un",
            unidadCompra: espejoUnidadCompra!,
            factorConversion: espejoFactorConversion!,
            mermaPct: 0,
            stockSeguridad: 0,
            loteMinimoCompra: 1,
            leadTimeDias: 3,
            stockInicial: espejoStockInicial ?? 0,
            costoInicial: espejoCostoInicial ?? 0,
          },
        });

        const producto = await tx.producto.create({
          data: { ...datos, subcategoria: subcategoria || null, estacion: estacion || null, esReventa: true },
        });

        await tx.recetaLinea.create({
          data: {
            productoId: producto.id,
            insumoId: insumo.id,
            cantidad: 1,
            nota: "Insumo espejo (reventa directa)",
          },
        });
      } else {
        await tx.producto.create({
          data: { ...datos, subcategoria: subcategoria || null, estacion: estacion || null },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        errores: { codigo: ["Ya existe un producto (o insumo) con ese código."] },
      };
    }
    throw err;
  }

  revalidatePath("/recetas");
  return { ok: true };
}

export async function actualizarProducto(
  productoId: number,
  _prev: EstadoFormularioProducto,
  formData: FormData
): Promise<EstadoFormularioProducto> {
  const parsed = productoFormSchema.safeParse(datosDesdeFormulario(formData));
  if (!parsed.success) {
    return { ok: false, errores: parsed.error.flatten().fieldErrors };
  }

  const { subcategoria, estacion, ...datos } = parsed.data;

  try {
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        codigo: datos.codigo,
        nombre: datos.nombre,
        categoria: datos.categoria,
        precioVenta: datos.precioVenta,
        tiempoPreparacionMin: datos.tiempoPreparacionMin,
        subcategoria: subcategoria || null,
        estacion: estacion || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, errores: { codigo: ["Ya existe un producto con ese código."] } };
    }
    throw err;
  }

  revalidatePath("/recetas");
  revalidatePath(`/recetas/${productoId}`);
  return { ok: true };
}

export async function cambiarEstadoProducto(productoId: number, activo: boolean) {
  await prisma.producto.update({ where: { id: productoId }, data: { activo } });
  revalidatePath("/recetas");
}

export interface LineaRecetaInput {
  insumoId: number;
  cantidad: number;
  nota?: string;
}

export async function guardarReceta(productoId: number, lineas: LineaRecetaInput[]) {
  await prisma.$transaction([
    prisma.recetaLinea.deleteMany({ where: { productoId } }),
    prisma.recetaLinea.createMany({
      data: lineas.map((l) => ({
        productoId,
        insumoId: l.insumoId,
        cantidad: l.cantidad,
        nota: l.nota,
      })),
    }),
  ]);

  revalidatePath(`/recetas/${productoId}`);
  revalidatePath("/recetas");
}

export async function duplicarReceta(
  productoOrigenId: number,
  nuevoCodigo: string,
  nuevoNombre: string
): Promise<{ ok: boolean; mensaje?: string; nuevoId?: number }> {
  const origen = await prisma.producto.findUnique({
    where: { id: productoOrigenId },
    include: { recetaLineas: true },
  });
  if (!origen) return { ok: false, mensaje: "Producto de origen no encontrado." };

  try {
    const nuevo = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          codigo: nuevoCodigo,
          nombre: nuevoNombre,
          categoria: origen.categoria,
          subcategoria: origen.subcategoria,
          precioVenta: origen.precioVenta,
          tiempoPreparacionMin: origen.tiempoPreparacionMin,
          estacion: origen.estacion,
        },
      });
      if (origen.recetaLineas.length > 0) {
        await tx.recetaLinea.createMany({
          data: origen.recetaLineas.map((l) => ({
            productoId: producto.id,
            insumoId: l.insumoId,
            cantidad: l.cantidad,
            nota: l.nota,
          })),
        });
      }
      return producto;
    });

    revalidatePath("/recetas");
    return { ok: true, nuevoId: nuevo.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, mensaje: "Ya existe un producto con ese código." };
    }
    throw err;
  }
}
