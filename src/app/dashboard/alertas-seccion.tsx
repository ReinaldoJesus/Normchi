import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AlertaDashboard } from "@/lib/dashboard";

export function AlertasSeccion({ alertas }: { alertas: AlertaDashboard[] }) {
  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        Sin alertas — todo dentro de lo esperado.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border">
      {alertas.map((alerta, i) => (
        <Link
          key={i}
          href={alerta.href}
          className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${alerta.urgente ? "bg-destructive" : "bg-amber-500"}`}
          />
          <span className="flex-1">{alerta.mensaje}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
