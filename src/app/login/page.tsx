import Image from "next/image";
import { redirect } from "next/navigation";

import { obtenerSesion } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const sesion = await obtenerSesion();
  if (sesion) redirect("/dashboard");

  const desde = typeof searchParams.desde === "string" ? searchParams.desde : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="Normchi"
            width={96}
            height={96}
            className="rounded-2xl"
            priority
          />
          <h1 className="text-xl font-semibold tracking-tight">Normchi</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
        </div>
        <LoginForm desde={desde} />
      </div>
    </div>
  );
}
