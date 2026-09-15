import { z } from "zod";

export const parametrosFormSchema = z.object({
  ivaPct: z.coerce.number({ error: "Requerido" }).min(0).max(1),
  preciosIncluyenIva: z.boolean(),
  horizontePlanificacionDias: z.coerce.number({ error: "Requerido" }).int().min(1).max(60),
  ventanaHistorialDias: z.coerce.number({ error: "Requerido" }).int().min(7).max(365),
  alphaSuavizamiento: z.coerce.number({ error: "Requerido" }).min(0.01).max(1),
  capacidadMinutosDia: z.coerce.number({ error: "Requerido" }).int().min(1),
  costosFijosDiarios: z.coerce.number({ error: "Requerido" }).min(0),
  diasOperacionSemana: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, "Selecciona al menos un día"),
});

export type ParametrosFormValues = z.infer<typeof parametrosFormSchema>;
