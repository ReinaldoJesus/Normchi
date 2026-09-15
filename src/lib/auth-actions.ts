"use server";

import { redirect } from "next/navigation";

import { cerrarSesion } from "./auth";

export async function cerrarSesionAction(): Promise<void> {
  await cerrarSesion();
  redirect("/login");
}
