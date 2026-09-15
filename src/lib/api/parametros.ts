import { apiFetch, ApiError } from "./http";

export interface EstadoFormularioParametros {
  ok: boolean;
  errores?: Record<string, string[] | undefined>;
  mensajeGeneral?: string;
}

function datosDesdeFormulario(formData: FormData) {
  return {
    ivaPct: Number(formData.get("ivaPctPorcentaje")) / 100,
    preciosIncluyenIva: formData.get("preciosIncluyenIva") === "on",
    horizontePlanificacionDias: formData.get("horizontePlanificacionDias"),
    ventanaHistorialDias: formData.get("ventanaHistorialDias"),
    alphaSuavizamiento: formData.get("alphaSuavizamiento"),
    capacidadMinutosDia: formData.get("capacidadMinutosDia"),
    costosFijosDiarios: formData.get("costosFijosDiarios"),
    diasOperacionSemana: formData.getAll("diasOperacionSemana"),
  };
}

export async function guardarParametros(
  _prev: EstadoFormularioParametros,
  formData: FormData
): Promise<EstadoFormularioParametros> {
  try {
    await apiFetch("/api/parametros", {
      method: "PATCH",
      body: JSON.stringify(datosDesdeFormulario(formData)),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.cuerpo?.errores) return { ok: false, errores: error.cuerpo.errores };
      return { ok: false, mensajeGeneral: error.message };
    }
    return { ok: false, mensajeGeneral: "No se pudo conectar con el servidor." };
  }
}
