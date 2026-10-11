"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { duplicarCompra } from "@/lib/api/compras";

export function DuplicarButton({ compraId }: { compraId: number }) {
  const router = useRouter();
  const [duplicando, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={duplicando}
      onClick={() =>
        startTransition(async () => {
          const resultado = await duplicarCompra(compraId);
          if (resultado.ok && resultado.compraId) {
            router.push(`/compras/${resultado.compraId}`);
          }
        })
      }
    >
      <Copy />
      {duplicando ? "Duplicando…" : "Duplicar"}
    </Button>
  );
}
