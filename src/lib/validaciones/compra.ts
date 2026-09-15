import { z } from "zod";

export const lineaCompraSchema = z.object({
  insumoId: z.number().int().positive({ error: "Selecciona un insumo" }),
  cantidadCompra: z.number().positive({ error: "Debe ser mayor a 0" }),
  precioUnitarioCompra: z.number().min(0, "Requerido"),
});

export const compraFormSchema = z.object({
  proveedorId: z.number().int().positive({ error: "Selecciona un proveedor" }),
  fechaEmision: z.string().min(1, "Requerido"),
  fechaEsperada: z.string().min(1, "Requerido"),
  documento: z.string().trim().max(60),
  nota: z.string().trim().max(500),
  lineas: z.array(lineaCompraSchema).min(1, "Agrega al menos una línea"),
});

export type CompraFormValues = z.infer<typeof compraFormSchema>;
export type LineaCompraValues = z.infer<typeof lineaCompraSchema>;
