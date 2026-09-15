import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearPesos } from "@/lib/formato";
import type { ResumenCategoria, ResumenCierreDia } from "./actions";

export function ResumenDia({
  resumen,
  className,
}: {
  resumen: ResumenCierreDia;
  className?: string;
}) {
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen del día</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid grid-cols-3 gap-4">
            <Metrica etiqueta="Ingreso" valor={formatearPesos(resumen.ingreso)} />
            <Metrica etiqueta="Costo de materia prima" valor={formatearPesos(resumen.costo)} />
            <Metrica etiqueta="Margen" valor={formatearPesos(resumen.margen)} destacado />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CategoriaResumen titulo="Comida" datos={resumen.comida} />
            <CategoriaResumen titulo="Bebida" datos={resumen.bebida} />
          </div>

          {resumen.alertas.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                Insumos bajo stock de seguridad tras este consumo
              </p>
              <ul className="space-y-1 text-xs">
                {resumen.alertas.map((a) => (
                  <li key={a.insumoId} className="flex items-center justify-between gap-4">
                    <span>{a.nombre}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {a.stock.toFixed(1)} {a.unidadBase} · seguridad {a.stockSeguridad.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ningún insumo quedó bajo su stock de seguridad tras este consumo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={destacado ? "text-lg font-semibold" : "text-lg"}>{valor}</p>
    </div>
  );
}

function CategoriaResumen({ titulo, datos }: { titulo: string; datos: ResumenCategoria }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{titulo}</p>
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span>{datos.unidades} un.</span>
        <span>{formatearPesos(datos.ingreso)}</span>
        <span>{formatearPesos(datos.margen)}</span>
      </div>
    </div>
  );
}
