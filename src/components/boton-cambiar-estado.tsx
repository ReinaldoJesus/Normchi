"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Botón "Activar"/"Desactivar" reusado en las tablas de maestros (proveedores,
 * insumos, productos, usuarios). Ya no hay Server Action + revalidatePath
 * detrás — el cliente de API hace un fetch a /api/**, así que el refresco de
 * la tabla se pide explícito con router.refresh() al terminar.
 */
export function BotonCambiarEstado({
  activo,
  onCambiar,
}: {
  activo: boolean;
  onCambiar: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          await onCambiar();
          router.refresh();
        })
      }
    >
      {activo ? "Desactivar" : "Activar"}
    </Button>
  );
}
