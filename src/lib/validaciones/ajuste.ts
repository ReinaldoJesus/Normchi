import { z } from "zod";

export const MOTIVOS_AJUSTE = [
  "conteo_fisico",
  "merma",
  "vencimiento",
  "error_registro",
  "otro",
] as const;

export const ajusteFormSchema = z.object({
  fecha: z.string().min(1, "Requerido"),
  insumoId: z.number().int().positive({ error: "Selecciona un insumo" }),
  cantidadDelta: z.number().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  motivo: z.enum(MOTIVOS_AJUSTE, { error: "Selecciona un motivo" }),
  nota: z.string().trim().max(500),
});

export type AjusteFormValues = z.infer<typeof ajusteFormSchema>;
