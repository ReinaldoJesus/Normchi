import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { construirSeriesHistoricas } from "@/lib/planificacion";
import { sumarDiasStr } from "@/lib/planificacionConstantes";
import { obtenerParametros } from "@/lib/parametros";
import { fechaLocalAhora } from "@/lib/fechas";
import { ajustarModelo, construirSerie, pronosticarDia } from "@/lib/motor/pronostico";
import { calcularCostoTeoricoPorProducto } from "@/lib/costeoActual";
import {
  obtenerDatosMenuProductos,
  obtenerGastoCompras,
  obtenerCoberturaPorMes,
  obtenerEvolucionCostoInsumos,
  obtenerConsumoTeoricoVsAjustes,
  obtenerMixEvolucion,
} from "@/lib/reportes";
import type { PronosticoProductoMargen } from "@/lib/motor/utilidad";

import { MenuEngineeringSeccion } from "./menu-engineering-seccion";
import { RankingSeccion } from "./ranking-seccion";
import { MixEvolucionSeccion } from "./mix-evolucion-seccion";
import { CoberturaSeccion } from "./cobertura-seccion";
import { GastoComprasSeccion } from "./gasto-compras-seccion";
import { CostoInsumosSeccion } from "./costo-insumos-seccion";
import { MermaSeccion } from "./merma-seccion";
import { UtilidadSeccion } from "./utilidad-seccion";

export default async function ReportesPage() {
  const parametros = await obtenerParametros();

  const [
    datosMenu,
    gastoCompras,
    coberturaPorMes,
    evolucionCostoInsumos,
    consumoVsAjustes,
    mixEvolucion,
    { productos, seriesPorProducto },
    costoTeoricoPorProducto,
    productosConPrecio,
  ] = await Promise.all([
    obtenerDatosMenuProductos(30),
    obtenerGastoCompras(6),
    obtenerCoberturaPorMes(6),
    obtenerEvolucionCostoInsumos(90),
    obtenerConsumoTeoricoVsAjustes(90),
    obtenerMixEvolucion(12),
    construirSeriesHistoricas(parametros.diasOperacionSemana, parametros.ventanaHistorialDias),
    calcularCostoTeoricoPorProducto(),
    prisma.producto.findMany({ where: { activo: true }, select: { id: true, precioVenta: true } }),
  ]);

  // Utilidad proyectada: mismo pipeline de pronóstico que Planificación,
  // horizonte por defecto, para estimar el margen bruto de los próximos días.
  const hoy = fechaLocalAhora();
  const horizonFechas = Array.from(
    { length: parametros.horizontePlanificacionDias },
    (_, i) => sumarDiasStr(hoy, i)
  );
  const precioVentaPorProducto = new Map(productosConPrecio.map((p) => [p.id, Number(p.precioVenta)]));

  const productosUtilidad: PronosticoProductoMargen[] = productos.map((p) => {
    const diasHistoricos = seriesPorProducto.get(p.id) ?? [];
    const serie = construirSerie(diasHistoricos);
    const modelo = ajustarModelo(serie.observaciones, parametros.alphaSuavizamiento);
    const pronosticoPorDia = horizonFechas.map((fecha) =>
      modelo ? pronosticarDia(modelo, new Date(`${fecha}T00:00:00Z`).getUTCDay()) : 0
    );
    const costoTeorico = costoTeoricoPorProducto.get(p.id) ?? 0;
    const precioVenta = precioVentaPorProducto.get(p.id) ?? 0;
    const precioVentaNeto = parametros.preciosIncluyenIva
      ? precioVenta / (1 + parametros.ivaPct)
      : precioVenta;
    return {
      productoId: p.id,
      margenContribucionUnitario: precioVentaNeto - costoTeorico,
      pronosticoPorDia,
      precioVentaNeto,
    };
  });

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Menu engineering, gasto en compras, márgenes y utilidad proyectada."
      />

      <Seccion titulo="Menu engineering">
        <MenuEngineeringSeccion datos={datosMenu} />
      </Seccion>

      <Seccion titulo="Ranking de productos">
        <RankingSeccion datos={datosMenu} />
      </Seccion>

      <Seccion titulo="Utilidad proyectada">
        <UtilidadSeccion
          productos={productosUtilidad}
          horizonteDias={parametros.horizontePlanificacionDias}
          costosFijosDiariosDefecto={parametros.costosFijosDiarios}
        />
      </Seccion>

      <Seccion titulo="Evolución del mix comida / bebida">
        <MixEvolucionSeccion semanas={mixEvolucion} />
      </Seccion>

      <Seccion titulo="Cobertura de registro de ventas">
        <CoberturaSeccion meses={coberturaPorMes} />
      </Seccion>

      <Seccion titulo="Gasto en compras">
        <GastoComprasSeccion filas={gastoCompras} />
      </Seccion>

      <Seccion titulo="Evolución del costo medio de insumos">
        <CostoInsumosSeccion series={evolucionCostoInsumos} />
      </Seccion>

      <Seccion titulo="Consumo teórico vs. ajustes de inventario" ultima>
        <MermaSeccion filas={consumoVsAjustes} />
      </Seccion>
    </div>
  );
}

function Seccion({
  titulo,
  children,
  ultima,
}: {
  titulo: string;
  children: React.ReactNode;
  ultima?: boolean;
}) {
  return (
    <section className={ultima ? "" : "mb-10"}>
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
