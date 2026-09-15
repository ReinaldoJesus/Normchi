"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { enviarCompra } from "./actions";

export function EnviarButton({ compraId }: { compraId: number }) {
  const router = useRouter();
  const [enviando, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={enviando}
      onClick={() =>
        startTransition(async () => {
          await enviarCompra(compraId);
          router.refresh();
        })
      }
    >
      <Send />
      {enviando ? "Enviando…" : "Enviar al proveedor"}
    </Button>
  );
}
