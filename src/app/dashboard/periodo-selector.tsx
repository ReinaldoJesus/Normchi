"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodoDashboard } from "@/lib/dashboard";

const ETIQUETAS: Record<PeriodoDashboard, string> = {
  hoy: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  mes: "Mes actual",
};

export function PeriodoSelector({ periodo }: { periodo: PeriodoDashboard }) {
  const router = useRouter();

  return (
    <Select value={periodo} onValueChange={(v) => router.push(`/dashboard?periodo=${v}`)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ETIQUETAS) as PeriodoDashboard[]).map((p) => (
          <SelectItem key={p} value={p}>
            {ETIQUETAS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
