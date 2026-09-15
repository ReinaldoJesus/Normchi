import { z } from "zod";

export const UNIDADES_BASE = ["g", "ml", "un"] as const;

export const CATEGORIAS_INSUMO_SUGERIDAS = [
  "Carnes",
  "Verduras",
  "Abarrotes",
  "Lácteos",
  "Bebidas",
  "Desechables",
] as const;

function campoNumerico(mensaje: string) {
  return z.coerce.number({ error: mensaje });
}

export const insumoFormSchema = z.object({
  codigo: z.string().trim().min(1, "Requerido").max(30),
  nombre: z.string().trim().min(1, "Requerido").max(120),
  categoria: z.string().trim().min(1, "Requerido").max(60),
  unidadBase: z.enum(UNIDADES_BASE, { error: "Selecciona una unidad" }),
  unidadCompra: z.string().trim().min(1, "Requerido").max(60),
  factorConversion: campoNumerico("Requerido").positive(
    "Debe ser mayor a 0"
  ),
  // Se captura como porcentaje (0-100) en la UI y se guarda como fracción (0-1).
  mermaPorcentaje: campoNumerico("Requerido").min(0).max(100),
  stockSeguridad: campoNumerico("Requerido").min(0),
  loteMinimoCompra: campoNumerico("Requerido").positive(
    "Debe ser mayor a 0"
  ),
  leadTimeDias: campoNumerico("Requerido").int().min(0),
  proveedorId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null)),
  perecible: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  stockInicial: campoNumerico("Requerido").min(0),
  costoInicial: campoNumerico("Requerido").min(0),
});

export type InsumoFormValues = z.infer<typeof insumoFormSchema>;
