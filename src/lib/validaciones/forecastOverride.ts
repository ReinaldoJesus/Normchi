import { z } from "zod";

export const overrideFormSchema = z.object({
  productoId: z.number().int().positive(),
  fecha: z.string().min(1, "Requerido"),
  cantidad: z.number().min(0, "Requerido"),
  motivo: z.string().trim().max(200),
});

export type OverrideFormValues = z.infer<typeof overrideFormSchema>;
