import { apiFetch, ApiError } from "./http";
import type { CompraFormValues } from "@/lib/validaciones/compra";

export interface ResultadoAccionCompra {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  compraId?: number;
}

export interface LineaRecepcionInput {
  compraLineaId: number;
  cantidadRecibida: number;
  precioUnitarioCompra: number;
}

function errorComoResultado(error: unknown): ResultadoAccionCompra {
  if (error instanceof ApiError) {
    if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
    return { ok: false, mensaje: error.cuerpo?.error ?? error.message };
  }
  return { ok: false, mensaje: "No se pudo conectar con el servidor." };
}

export async function crearCompra(datos: CompraFormValues): Promise<ResultadoAccionCompra> {
  try {
    const compra = await apiFetch<{ id: number }>("/api/compras", {
      method: "POST",
      body: JSON.stringify(datos),
    });
    return { ok: true, compraId: compra.id };
  } catch (error) {
    return errorComoResultado(error);
  }
}

export async function actualizarCompra(
  compraId: number,
  datos: CompraFormValues
): Promise<ResultadoAccionCompra> {
  try {
    await apiFetch(`/api/compras/${compraId}`, {
      method: "PATCH",
      body: JSON.stringify(datos),
    });
    return { ok: true, compraId };
  } catch (error) {
    return errorComoResultado(error);
  }
}

export async function enviarCompra(compraId: number): Promise<ResultadoAccionCompra> {
  try {
    await apiFetch(`/api/compras/${compraId}/enviar`, { method: "POST" });
    return { ok: true };
  } catch (error) {
    return errorComoResultado(error);
  }
}

export async function anularCompra(
  compraId: number,
  motivo: string
): Promise<ResultadoAccionCompra> {
  try {
    await apiFetch(`/api/compras/${compraId}/anular`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    });
    return { ok: true };
  } catch (error) {
    return errorComoResultado(error);
  }
}

export async function recibirCompra(
  compraId: number,
  fechaRecepcion: string,
  lineas: LineaRecepcionInput[]
): Promise<ResultadoAccionCompra> {
  try {
    await apiFetch(`/api/compras/${compraId}/recepcion`, {
      method: "POST",
      body: JSON.stringify({ fechaRecepcion, lineas }),
    });
    return { ok: true };
  } catch (error) {
    return errorComoResultado(error);
  }
}
