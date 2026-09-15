export interface CuerpoErrorApi {
  error?: string;
  errores?: Record<string, string[] | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public cuerpo: CuerpoErrorApi | null
  ) {
    super(cuerpo?.error ?? `Error ${status}`);
  }
}

/**
 * Cliente fetch compartido por src/lib/api/<modulo>.ts. Lanza ApiError con
 * el cuerpo de error tal como lo arma manejarErrorApi() en el servidor
 * (src/lib/apiAuth.ts), para que cada wrapper de módulo pueda mapearlo al
 * mismo shape EstadoFormulario* que ya consumen los componentes.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const tipo = res.headers.get("content-type") ?? "";
  const cuerpo = tipo.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, cuerpo as CuerpoErrorApi | null);
  }
  return cuerpo as T;
}
