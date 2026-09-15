import { z } from "zod";

export const ROLES_USUARIO = ["admin", "compras", "cocina", "cajero", "lectura"] as const;
export type RolUsuario = (typeof ROLES_USUARIO)[number];

export const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  admin: "Administrador",
  compras: "Compras",
  cocina: "Cocina",
  cajero: "Cajero",
  lectura: "Solo lectura",
};

export const usuarioCrearSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120),
  email: z.email("Correo inválido"),
  rol: z.enum(ROLES_USUARIO, { error: "Requerido" }),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const usuarioActualizarSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120),
  email: z.email("Correo inválido"),
  rol: z.enum(ROLES_USUARIO, { error: "Requerido" }),
  password: z.union([z.string().min(6, "Mínimo 6 caracteres"), z.literal("")]),
});

export const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(1, "Requerido"),
});
