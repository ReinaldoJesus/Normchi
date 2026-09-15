import { z } from "zod";

export const proveedorFormSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120),
  contacto: z.string().trim().max(120),
  telefono: z.string().trim().max(40),
  email: z.union([z.email("Correo inválido"), z.literal("")]),
  leadTimeDias: z.coerce.number({ error: "Requerido" }).int().min(0),
  condicionPago: z.string().trim().max(60),
});

export type ProveedorFormValues = z.infer<typeof proveedorFormSchema>;
