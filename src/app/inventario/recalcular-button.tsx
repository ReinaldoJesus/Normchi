"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { recalcularInventarioManual } from "./actions";

export function RecalcularButton() {
  const router = useRouter();
  const [enviando, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={enviando}
      onClick={() =>
        startTransition(async () => {
          await recalcularInventarioManual();
          router.refresh();
        })
      }
    >
      <RefreshCw className={enviando ? "animate-spin" : ""} />
      {enviando ? "Recalculando…" : "Recalcular inventario"}
    </Button>
  );
}
