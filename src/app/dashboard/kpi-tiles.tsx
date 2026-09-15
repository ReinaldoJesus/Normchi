import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearPesos, formatearPorcentaje } from "@/lib/formato";
import type { DatosDashboard } from "@/lib/dashboard";

function Desglose({ comida, bebida }: { comida: number; bebida: number }) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Comida {formatearPesos(comida)} · Bebida {formatearPesos(bebida)}
    </p>
  );
}

function Tile({
  etiqueta,
  valor,
  sub,
  destacado,
  negativo,
}: {
  etiqueta: string;
  valor: string;
  sub?: React.ReactNode;
  destacado?: boolean;
  negativo?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{etiqueta}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            destacado
              ? `text-2xl font-semibold ${negativo ? "text-destructive" : ""}`
              : "text-xl"
          }
        >
          {valor}
        </p>
        {sub}
      </CardContent>
    </Card>
  );
}

export function KpiTiles({ datos }: { datos: DatosDashboard }) {
  const variacionComida = datos.mix.comidaPct - datos.mix.comidaPctAnterior;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        etiqueta="Ventas netas"
        valor={formatearPesos(datos.ventasNetas.total)}
        destacado
        sub={
          <>
            <Desglose comida={datos.ventasNetas.comida} bebida={datos.ventasNetas.bebida} />
            <p className="mt-1 text-xs text-muted-foreground">
              Mix comida {formatearPorcentaje(datos.mix.comidaPct)}
              {" · "}
              {variacionComida >= 0 ? "+" : ""}
              {(variacionComida * 100).toFixed(1)} pp vs. período anterior
            </p>
          </>
        }
      />
      <Tile
        etiqueta={`Costo de materia prima · food cost ${formatearPorcentaje(datos.foodCostPct.total)}`}
        valor={formatearPesos(datos.costoMateriaPrima.total)}
        sub={<Desglose comida={datos.costoMateriaPrima.comida} bebida={datos.costoMateriaPrima.bebida} />}
      />
      <Tile
        etiqueta="Margen bruto"
        valor={formatearPesos(datos.margenBruto.total)}
        negativo={datos.margenBruto.total < 0}
        sub={<Desglose comida={datos.margenBruto.comida} bebida={datos.margenBruto.bebida} />}
      />
      <Tile etiqueta="Valor de inventario" valor={formatearPesos(datos.valorInventario)} />
      <Tile etiqueta="Compras del período" valor={formatearPesos(datos.comprasPeriodo)} />
      <Tile
        etiqueta="Utilidad estimada"
        valor={formatearPesos(datos.utilidadEstimada)}
        destacado
        negativo={datos.utilidadEstimada < 0}
      />
    </div>
  );
}
