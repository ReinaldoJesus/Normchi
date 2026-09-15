import { apiFetch, ApiError } from "./http";

export interface EstadoFormularioProducto {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

export interface LineaRecetaInput {
  insumoId: number;
  cantidad: number;
  nota?: string;
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

function errorComoEstado(error: unknown): EstadoFormularioProducto {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
    return { ok: false, mensajeGeneral: error.message };
  }
  return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
}

export async function crearProducto(
  _prev: EstadoFormularioProducto,
  formData: FormData
): Promise<EstadoFormularioProducto> {
  try {
    await apiFetch("/api/productos", {
      method: "POST",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function actualizarProducto(
  productoId: number,
  _prev: EstadoFormularioProducto,
  formData: FormData
): Promise<EstadoFormularioProducto> {
  try {
    await apiFetch(`/api/productos/${productoId}`, {
      method: "PATCH",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    return errorComoEstado(error);
  }
}

export async function cambiarEstadoProducto(productoId: number, activo: boolean): Promise<void> {
  await apiFetch(`/api/productos/${productoId}`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}

export async function guardarReceta(
  productoId: number,
  lineas: LineaRecetaInput[]
): Promise<void> {
  await apiFetch(`/api/productos/${productoId}/receta`, {
    method: "PUT",
    body: JSON.stringify({ lineas }),
  });
}

export async function duplicarReceta(
  productoOrigenId: number,
  nuevoCodigo: string,
  nuevoNombre: string
): Promise<{ ok: boolean; mensaje?: string; nuevoId?: number }> {
  try {
    const resultado = await apiFetch<{ nuevoId: number }>(
      `/api/productos/${productoOrigenId}/duplicar`,
      { method: "POST", body: JSON.stringify({ codigo: nuevoCodigo, nombre: nuevoNombre }) }
    );
    return { ok: true, nuevoId: resultado.nuevoId };
  } catch (error) {
    if (error instanceof ApiError) {
      const primerError = Object.values(error.cuerpo?.errores ?? {})[0]?.[0];
      return { ok: false, mensaje: error.cuerpo?.error ?? primerError ?? error.message };
    }
    return { ok: false, mensaje: "No se pudo conectar con el servidor." };
  }
}
