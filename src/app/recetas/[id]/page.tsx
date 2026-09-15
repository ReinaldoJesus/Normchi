import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { obtenerProductoParaEditor } from "@/lib/services/productos";
import { Button } from "@/components/ui/button";
import { RecetaEditor } from "./receta-editor";

export default async function RecetaPage(props: PageProps<"/recetas/[id]">) {
  const { id } = await props.params;
  const productoId = Number(id);
  if (!Number.isInteger(productoId)) notFound();

  const datos = await obtenerProductoParaEditor(productoId);
  if (!datos) notFound();

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/recetas">
          <ArrowLeft />
          Recetas
        </Link>
      </Button>

      <RecetaEditor
        producto={datos.producto}
        insumos={datos.insumos}
        lineasIniciales={datos.lineasIniciales}
        ivaPct={datos.ivaPct}
        preciosIncluyenIva={datos.preciosIncluyenIva}
      />
    </div>
  );
}
