import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { obtenerEstadoInsumos } from "@/lib/inventario";
import { obtenerParametros } from "@/lib/parametros";
import { costearProducto, type SemaforoFoodCost } from "@/lib/motor/recetas";
import { ErrorCampo } from "@/lib/apiAuth";
import type { ProductoFormValues } from "@/lib/validaciones/producto";
import type { ProductoParaEditar } from "@/app/recetas/producto-form";

export interface FilaProducto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  precioVenta: number;
  costoTeorico: number;
  margenUnitario: number;
  margenPct: number;
  foodCostPct: number;
  semaforo: SemaforoFoodCost;
  tieneReceta: boolean;
  activo: boolean;
  form: ProductoParaEditar;
}

export async function listarProductosConCosteo(): Promise<FilaProducto[]> {
  const [{ ivaPct, preciosIncluyenIva }, productos, estadoPorInsumo] = await Promise.all([
    obtenerParametros(),
    prisma.producto.findMany({
      include: { recetaLineas: { include: { insumo: true } } },
      orderBy: { nombre: "asc" },
    }),
    obtenerEstadoInsumos(),
  ]);

  return productos.map((p) => {
    const tieneReceta = p.recetaLineas.length > 0;
    const costeo = tieneReceta
      ? costearProducto({
          precioVenta: Number(p.precioVenta),
          ivaPct,
          preciosIncluyenIva,
          recetaLineas: p.recetaLineas.map((l) => ({
            productoId: p.id,
            insumoId: l.insumoId,
            cantidad: Number(l.cantidad),
            mermaPct: Number(l.insumo.mermaPct),
          })),
          costoMedioPorInsumo: Object.fromEntries(
            p.recetaLineas.map((l) => [
              l.insumoId,
              estadoPorInsumo.get(l.insumoId)?.costoMedio ?? Number(l.insumo.costoInicial),
            ])
          ),
        })
      : null;

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      precioVenta: Number(p.precioVenta),
      costoTeorico: costeo?.costoTeorico ?? 0,
      margenUnitario: costeo?.margenUnitario ?? 0,
      margenPct: costeo?.margenPct ?? 0,
      foodCostPct: costeo?.foodCostPct ?? 0,
      semaforo: costeo?.semaforo ?? "verde",
      tieneReceta,
      activo: p.activo,
      form: {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        subcategoria: p.subcategoria ?? "",
        precioVenta: p.precioVenta.toString(),
        tiempoPreparacionMin: p.tiempoPreparacionMin.toString(),
        estacion: p.estacion ?? "",
        esReventa: p.esReventa,
      },
    };
  });
}

export async function obtenerProductoParaEditor(productoId: number) {
  const [{ ivaPct, preciosIncluyenIva }, producto, insumos, estadoPorInsumo] = await Promise.all([
    obtenerParametros(),
    prisma.producto.findUnique({ where: { id: productoId }, include: { recetaLineas: true } }),
    prisma.insumo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    obtenerEstadoInsumos(),
  ]);
  if (!producto) return null;

  const insumosParaEditor = insumos.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    unidadBase: i.unidadBase,
    mermaPct: Number(i.mermaPct),
    costoMedio: estadoPorInsumo.get(i.id)?.costoMedio ?? Number(i.costoInicial),
  }));

  const lineasIniciales = producto.recetaLineas.map((l) => ({
    insumoId: l.insumoId,
    cantidad: Number(l.cantidad),
  }));

  return {
    producto: {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      precioVenta: Number(producto.precioVenta),
      tiempoPreparacionMin: Number(producto.tiempoPreparacionMin),
      esReventa: producto.esReventa,
    },
    insumos: insumosParaEditor,
    lineasIniciales,
    ivaPct,
    preciosIncluyenIva,
  };
}

export async function crearProducto(datos: ProductoFormValues) {
  const {
    esReventa,
    espejoUnidadCompra,
    espejoFactorConversion,
    espejoStockInicial,
    espejoCostoInicial,
    subcategoria,
    estacion,
    ...resto
  } = datos;

  if (esReventa && (!espejoUnidadCompra || !espejoFactorConversion)) {
    throw new ErrorCampo(
      "espejoUnidadCompra",
      "Unidad de compra y factor de conversión son requeridos para reventa directa."
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (esReventa) {
        const insumo = await tx.insumo.create({
          data: {
            codigo: resto.codigo,
            nombre: resto.nombre,
            categoria: resto.categoria === "bebida" ? "Bebidas" : "Comida",
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
          data: {
            ...resto,
            subcategoria: subcategoria || null,
            estacion: estacion || null,
            esReventa: true,
          },
        });

        await tx.recetaLinea.create({
          data: {
            productoId: producto.id,
            insumoId: insumo.id,
            cantidad: 1,
            nota: "Insumo espejo (reventa directa)",
          },
        });
        return producto;
      }

      return tx.producto.create({
        data: { ...resto, subcategoria: subcategoria || null, estacion: estacion || null },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErrorCampo("codigo", "Ya existe un producto (o insumo) con ese código.");
    }
    throw err;
  }
}

export async function actualizarProducto(productoId: number, datos: ProductoFormValues) {
  const { subcategoria, estacion, ...resto } = datos;
  try {
    return await prisma.producto.update({
      where: { id: productoId },
      data: {
        codigo: resto.codigo,
        nombre: resto.nombre,
        categoria: resto.categoria,
        precioVenta: resto.precioVenta,
        tiempoPreparacionMin: resto.tiempoPreparacionMin,
        subcategoria: subcategoria || null,
        estacion: estacion || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErrorCampo("codigo", "Ya existe un producto con ese código.");
    }
    throw err;
  }
}

export async function cambiarEstadoProducto(productoId: number, activo: boolean) {
  return prisma.producto.update({ where: { id: productoId }, data: { activo } });
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
}

export async function duplicarReceta(
  productoOrigenId: number,
  nuevoCodigo: string,
  nuevoNombre: string
) {
  const origen = await prisma.producto.findUnique({
    where: { id: productoOrigenId },
    include: { recetaLineas: true },
  });
  if (!origen) throw new ErrorCampo("codigo", "Producto de origen no encontrado.");

  try {
    return await prisma.$transaction(async (tx) => {
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ErrorCampo("codigo", "Ya existe un producto con ese código.");
    }
    throw err;
  }
}
