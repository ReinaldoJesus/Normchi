import Link from "next/link";

import {
  listarAjustesRecientes,
  listarInsumosBasico,
  listarMovimientos,
  TAMANOS_PAGINA_MOVIMIENTOS,
} from "@/lib/inventario";
import { toFechaCalendario } from "@/lib/fechas";
import { formatearCantidadLegible, formatearCostoUnitarioLegible } from "@/lib/formato";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AjusteForm } from "./ajuste-form";
import { RecalcularButton } from "./recalcular-button";

const ETIQUETA_TIPO = {
  saldo_inicial: "Saldo inicial",
  entrada_compra: "Entrada (compra)",
  consumo_venta: "Consumo (venta)",
  ajuste: "Ajuste",
} as const;

const ETIQUETA_MOTIVO = {
  conteo_fisico: "Conteo físico",
  merma: "Merma",
  vencimiento: "Vencimiento",
  error_registro: "Error de registro",
  otro: "Otro",
} as const;

export default async function InventarioPage(props: PageProps<"/inventario">) {
  const searchParams = await props.searchParams;
  const insumoIdParam =
    typeof searchParams.insumo === "string" ? Number(searchParams.insumo) : null;
  const categoriaParam =
    typeof searchParams.categoria === "string" ? searchParams.categoria : null;
  const pagina = typeof searchParams.pagina === "string" ? Math.max(1, Number(searchParams.pagina)) : 1;
  const tamanoPaginaParam =
    typeof searchParams.tamanoPagina === "string" ? Number(searchParams.tamanoPagina) : NaN;
  const tamanoPagina = TAMANOS_PAGINA_MOVIMIENTOS.includes(
    tamanoPaginaParam as (typeof TAMANOS_PAGINA_MOVIMIENTOS)[number]
  )
    ? tamanoPaginaParam
    : TAMANOS_PAGINA_MOVIMIENTOS[1];

  const [insumos, { movimientos, totalPaginas }, ajustes] = await Promise.all([
    listarInsumosBasico(),
    listarMovimientos(insumoIdParam, pagina, tamanoPagina, categoriaParam),
    listarAjustesRecientes(),
  ]);

  const categorias = Array.from(new Set(insumos.map((i) => i.categoria))).sort();
  const insumosVisibles = categoriaParam
    ? insumos.filter((i) => i.categoria === categoriaParam)
    : insumos;

  function construirQuery(overrides: {
    insumo?: number | null;
    categoria?: string | null;
    pagina?: number;
    tamanoPagina?: number;
  }) {
    const params = new URLSearchParams();
    const insumo = overrides.insumo !== undefined ? overrides.insumo : insumoIdParam;
    const categoria = overrides.categoria !== undefined ? overrides.categoria : categoriaParam;
    const paginaFinal = overrides.pagina ?? pagina;
    const tamanoPaginaFinal = overrides.tamanoPagina ?? tamanoPagina;
    if (insumo) params.set("insumo", String(insumo));
    if (categoria) params.set("categoria", categoria);
    if (paginaFinal > 1) params.set("pagina", String(paginaFinal));
    if (tamanoPaginaFinal !== TAMANOS_PAGINA_MOVIMIENTOS[1]) {
      params.set("tamanoPagina", String(tamanoPaginaFinal));
    }
    const query = params.toString();
    return query ? `/inventario?${query}` : "/inventario";
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Ledger de movimientos, ajustes y conteo físico."
        actions={
          <div className="flex items-center gap-2">
            <RecalcularButton />
            <AjusteForm insumos={insumos} />
          </div>
        }
      />

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Ajustes recientes</h2>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Sin ajustes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                ajustes.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{toFechaCalendario(a.fecha)}</TableCell>
                    <TableCell className="font-medium">{a.insumo.nombre}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        Number(a.cantidadDelta) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {Number(a.cantidadDelta) > 0 ? "+" : ""}
                      {formatearCantidadLegible(a.cantidadDelta, a.insumo.unidadBase)}
                    </TableCell>
                    <TableCell>{ETIQUETA_MOTIVO[a.motivo]}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {a.nota ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.usuario.nombre}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Movimientos</h2>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Por página:</span>
            {TAMANOS_PAGINA_MOVIMIENTOS.map((tamano) => (
              <Link
                key={tamano}
                href={construirQuery({ tamanoPagina: tamano, pagina: 1 })}
                className={`rounded-full border px-2.5 py-1 ${
                  tamanoPagina === tamano ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {tamano}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="pt-1 text-xs text-muted-foreground">Categoría:</span>
          <Link
            href={construirQuery({ categoria: null, insumo: null, pagina: 1 })}
            className={`rounded-full border px-3 py-1 text-xs ${
              !categoriaParam ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              href={construirQuery({ categoria: c, insumo: null, pagina: 1 })}
              className={`rounded-full border px-3 py-1 text-xs ${
                categoriaParam === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="pt-1 text-xs text-muted-foreground">Insumo:</span>
          <Link
            href={construirQuery({ insumo: null, pagina: 1 })}
            className={`rounded-full border px-3 py-1 text-xs ${
              !insumoIdParam ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Todos
          </Link>
          {insumosVisibles.map((i) => (
            <Link
              key={i.id}
              href={construirQuery({ insumo: i.id, pagina: 1 })}
              className={`rounded-full border px-3 py-1 text-xs ${
                insumoIdParam === i.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {i.nombre}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo unitario</TableHead>
                <TableHead className="text-right">Costo medio</TableHead>
                <TableHead className="text-right">Stock resultante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Sin movimientos todavía.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{toFechaCalendario(m.fecha)}</TableCell>
                    <TableCell className="font-medium">{m.insumo.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ETIQUETA_TIPO[m.tipo]}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        Number(m.cantidad) < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {Number(m.cantidad) > 0 ? "+" : ""}
                      {formatearCantidadLegible(m.cantidad, m.insumo.unidadBase)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {m.tipo === "ajuste"
                        ? "—"
                        : formatearCostoUnitarioLegible(m.costoUnitario, m.insumo.unidadBase)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatearCostoUnitarioLegible(m.costoMedioResultante, m.insumo.unidadBase)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearCantidadLegible(m.stockResultante, m.insumo.unidadBase)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPaginas > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            {pagina > 1 ? (
              <Link href={construirQuery({ pagina: pagina - 1 })} className="hover:text-foreground">
                ← Anterior
              </Link>
            ) : null}
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Link href={construirQuery({ pagina: pagina + 1 })} className="hover:text-foreground">
                Siguiente →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
