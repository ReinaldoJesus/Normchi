// Tipos compartidos por la capa de motor (src/lib/motor/). Funciones puras:
// reciben datos planos, devuelven resultados. Sin llamadas a DB, sin hooks.
// Ver normchi-especificacion.md §4 "Reglas de arquitectura no negociables".

export type UnidadBaseMotor = "g" | "ml" | "un";
export type CategoriaProductoMotor = "comida" | "bebida";

export interface RecetaLineaMotor {
  productoId: number;
  insumoId: number;
  /** Cantidad en unidad base del insumo, por 1 unidad de producto. */
  cantidad: number;
  /** Merma del insumo (0 a 1), copiada desde el maestro de insumos. */
  mermaPct: number;
}

export interface InsumoMotor {
  id: number;
  unidadBase: UnidadBaseMotor;
  factorConversion: number;
  mermaPct: number;
  stockSeguridad: number;
  loteMinimoCompra: number;
  leadTimeDias: number;
  /** Costo medio vigente (no requiere recorrer el ledger completo). */
  costoMedio: number;
  stockActual: number;
}

export interface ProductoMotor {
  id: number;
  categoria: CategoriaProductoMotor;
  precioVenta: number;
  tiempoPreparacionMin: number;
  esReventa?: boolean;
  estacion?: string | null;
}

export interface CompraLineaEvento {
  id: number;
  compraId: number;
  insumoId: number;
  /** Fecha de recepción (YYYY-MM-DD). Solo compras en estado 'recibida'. */
  fecha: string;
  cantidadBase: number;
  costoUnitarioBase: number;
}

export interface AjusteEvento {
  id: number;
  insumoId: number;
  fecha: string;
  cantidadDelta: number;
}

export interface VentaLineaEvento {
  id: number;
  ventaId: number;
  fecha: string;
  productoId: number;
  cantidad: number;
}

export type TipoMovimientoMotor =
  | "saldo_inicial"
  | "entrada_compra"
  | "ajuste"
  | "consumo_venta";

export interface MovimientoMotor {
  fecha: string;
  secuencia: number;
  insumoId: number;
  tipo: TipoMovimientoMotor;
  origenTabla: "saldo_inicial" | "compras" | "ajustes_inventario" | "ventas";
  origenId: number;
  cantidad: number;
  costoUnitario: number;
  costoMedioResultante: number;
  stockResultante: number;
}

export interface CogsDiaProducto {
  fecha: string;
  productoId: number;
  cogs: number;
}
