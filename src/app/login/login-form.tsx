"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesion, type EstadoLogin } from "@/lib/api/auth";

export function LoginForm({ desde }: { desde?: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoLogin>({ ok: false });
  const [enviando, startTransition] = useTransition();

  function enviar(formData: FormData) {
    startTransition(async () => {
      const resultado = await iniciarSesion(estado, formData);
      setEstado(resultado);
      if (resultado.ok) {
        router.push(desde || "/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <form action={enviar} className="grid gap-4 rounded-xl border p-6">
      {estado.mensajeGeneral ? (
        <p className="text-sm text-destructive">{estado.mensajeGeneral}</p>
      ) : null}
      <div className="grid gap-1.5">
        <Label>Correo</Label>
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label>Contraseña</Label>
        <Input name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={enviando} className="mt-2">
        {enviando ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
