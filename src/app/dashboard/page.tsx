import { obtenerDashboard, type PeriodoDashboard } from "@/lib/dashboard";
import { PageHeader } from "@/components/page-header";
import { PeriodoSelector } from "./periodo-selector";
import { KpiTiles } from "./kpi-tiles";
import { VentasChart } from "./ventas-chart";
import { AlertasSeccion } from "./alertas-seccion";

const PERIODOS: PeriodoDashboard[] = ["hoy", "7d", "30d", "mes"];

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const periodoParam = typeof searchParams.periodo === "string" ? searchParams.periodo : "hoy";
  const periodo: PeriodoDashboard = PERIODOS.includes(periodoParam as PeriodoDashboard)
    ? (periodoParam as PeriodoDashboard)
    : "hoy";

  const datos = await obtenerDashboard(periodo);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ventas, margen y utilidad del período seleccionado."
        actions={<PeriodoSelector periodo={periodo} />}
      />

      <section className="mb-10">
        <KpiTiles datos={datos} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">Tendencia de ventas</h2>
        <VentasChart serie={datos.serieVentas} hoy={datos.hoy} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Alertas</h2>
        <AlertasSeccion alertas={datos.alertas} />
      </section>
    </div>
  );
}
