import Link from "next/link";

const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

export function CalendarioRegistro({
  mes,
  hoy,
  fechasRegistradas,
  fechasCierre,
}: {
  mes: string;
  hoy: string;
  fechasRegistradas: Set<string>;
  fechasCierre: Set<string>;
}) {
  const [anioStr, mesStr] = mes.split("-");
  const anio = Number(anioStr);
  const mesIndex = Number(mesStr) - 1;
  const primerDia = new Date(Date.UTC(anio, mesIndex, 1));
  const diasEnMes = new Date(Date.UTC(anio, mesIndex + 1, 0)).getUTCDate();
  const dowPrimerDia = primerDia.getUTCDay();

  const celdas: (string | null)[] = [
    ...Array(dowPrimerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => {
      const d = i + 1;
      return `${anioStr}-${mesStr}-${String(d).padStart(2, "0")}`;
    }),
  ];

  const mesAnterior = new Date(Date.UTC(anio, mesIndex - 1, 1)).toISOString().slice(0, 7);
  const mesSiguiente = new Date(Date.UTC(anio, mesIndex + 1, 1)).toISOString().slice(0, 7);
  const nombreMes = primerDia.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/ventas/historial?mes=${mesAnterior}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Anterior
        </Link>
        <p className="text-sm font-medium capitalize">{nombreMes}</p>
        <Link
          href={`/ventas/historial?mes=${mesSiguiente}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Siguiente →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={`vacio-${i}`} />;
          const esFuturo = fecha > hoy;
          const registrado = fechasRegistradas.has(fecha);
          const cerrado = fechasCierre.has(fecha);
          const faltante = !esFuturo && !registrado && !cerrado;

          let estilo = "bg-muted/40 text-muted-foreground";
          if (registrado) estilo = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
          else if (cerrado) estilo = "bg-muted text-muted-foreground";
          else if (faltante) estilo = "bg-destructive/10 text-destructive";

          const dia = Number(fecha.slice(-2));
          return (
            <Link
              key={fecha}
              href={`/ventas?fecha=${fecha}`}
              className={`flex aspect-square items-center justify-center rounded-md text-xs tabular-nums transition-colors hover:opacity-80 ${estilo}`}
            >
              {dia}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <Leyenda color="bg-emerald-500/60" texto="Registrado" />
        <Leyenda color="bg-destructive/60" texto="Sin registrar" />
        <Leyenda color="bg-muted-foreground/40" texto="Cierre / futuro" />
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {texto}
    </span>
  );
}
