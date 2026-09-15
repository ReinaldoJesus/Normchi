import Link from "next/link";
import { History, Upload } from "lucide-react";

import { fechaLocalAhora } from "@/lib/fechas";
import { obtenerDatosCierreDia } from "@/lib/services/ventas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CierreDia } from "./cierre-dia";

export default async function VentasPage(props: PageProps<"/ventas">) {
  const searchParams = await props.searchParams;
  const fecha =
    typeof searchParams.fecha === "string" ? searchParams.fecha : fechaLocalAhora();
  const canalParam = typeof searchParams.canal === "string" ? searchParams.canal : "salon";

  const { canal, dow, productos, diaCerrado, yaRegistrado } = await obtenerDatosCierreDia(
    fecha,
    canalParam
  );

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Cierre de día — carga el día completo en menos de 2 minutos, solo con teclado."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ventas/importar">
                <Upload />
                Importar CSV
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ventas/historial">
                <History />
                Historial
              </Link>
            </Button>
          </div>
        }
      />

      <CierreDia
        fecha={fecha}
        canal={canal}
        dow={dow}
        productos={productos}
        diaCerrado={diaCerrado}
        yaRegistrado={yaRegistrado}
      />
    </div>
  );
}
