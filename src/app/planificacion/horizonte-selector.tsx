"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HORIZONTES_DISPONIBLES } from "@/lib/planificacionConstantes";

export function HorizonteSelector({ horizonte }: { horizonte: number }) {
  const router = useRouter();

  return (
    <Select
      value={horizonte.toString()}
      onValueChange={(v) => router.push(`/planificacion?horizonte=${v}`)}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HORIZONTES_DISPONIBLES.map((h) => (
          <SelectItem key={h} value={h.toString()}>
            {h} días
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
