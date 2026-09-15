import { z } from "zod";

export const CANALES_VENTA = ["salon", "delivery", "retiro"] as const;

export const lineaVentaSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().min(0),
  precioUnitario: z.number().min(0),
});

export const cierreDiaSchema = z.object({
  fecha: z.string().min(1),
  canal: z.enum(CANALES_VENTA),
  lineas: z.array(lineaVentaSchema).min(1),
});

export type CierreDiaValues = z.infer<typeof cierreDiaSchema>;
