import { obtenerPlanificacion } from "@/lib/planificacion";
import { PageHeader } from "@/components/page-header";
import { HorizonteSelector } from "./horizonte-selector";
import { PronosticoSeccion } from "./pronostico-seccion";
import { MrpSeccion } from "./mrp-seccion";
import { CargaCocinaSeccion } from "./carga-cocina-chart";

export default async function PlanificacionPage(props: PageProps<"/planificacion">) {
  const searchParams = await props.searchParams;
  const horizonteParam = Number(searchParams.horizonte) || undefined;

  const { horizonte, hoy, filasPronostico, serieAgregada, grupos, cargaCocina, capacidadMinutosDia } =
    await obtenerPlanificacion(horizonteParam);

  return (
    <div>
      <PageHeader
        title="Planificación"
        description="Pronóstico de demanda, sugerencia de compra (MRP) y carga de cocina."
        actions={<HorizonteSelector horizonte={horizonte} />}
      />

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">Pronóstico de demanda</h2>
        <PronosticoSeccion filas={filasPronostico} serieAgregada={serieAgregada} hoy={hoy} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">Sugerencia de compra</h2>
        <MrpSeccion grupos={grupos} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Carga de cocina</h2>
        <CargaCocinaSeccion dias={cargaCocina} capacidadMinutosDia={capacidadMinutosDia} />
      </section>
    </div>
  );
}
