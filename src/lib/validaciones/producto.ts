import { z } from "zod";

export const CATEGORIAS_PRODUCTO = ["comida", "bebida"] as const;

function campoNumerico(mensaje: string) {
  return z.coerce.number({ error: mensaje });
}

export const productoFormSchema = z.object({
  codigo: z.string().trim().min(1, "Requerido").max(30),
  nombre: z.string().trim().min(1, "Requerido").max(120),
  categoria: z.enum(CATEGORIAS_PRODUCTO, { error: "Selecciona una categoría" }),
  subcategoria: z.string().trim().max(60),
  precioVenta: campoNumerico("Requerido").positive("Debe ser mayor a 0"),
  tiempoPreparacionMin: campoNumerico("Requerido").min(0),
  estacion: z.string().trim().max(60),
  esReventa: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  // Solo se usan cuando esReventa = true: crean el insumo espejo (§6.4.1).
  espejoUnidadCompra: z.string().trim().max(60).optional(),
  espejoFactorConversion: z.coerce.number().positive().optional(),
  espejoStockInicial: z.coerce.number().min(0).optional(),
  espejoCostoInicial: z.coerce.number().min(0).optional(),
});

export type ProductoFormValues = z.infer<typeof productoFormSchema>;
