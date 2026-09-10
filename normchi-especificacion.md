# Normchi — Sistema de gestión de costos, inventario y planificación

**Especificación funcional y técnica**
Versión 1.0 · Documento de entrada para implementación

---

## 0. Cómo usar este documento

Este documento es la fuente de verdad para construir la aplicación. Está escrito para ser implementado sin necesidad de entrevistar al usuario.

- Todo lo marcado como **[SUPUESTO]** es una decisión tomada por defecto que el usuario puede cambiar. Impleméntala como está, pero déjala parametrizable.
- Todo lo marcado como **[FUERA DE ALCANCE]** no se construye en esta iteración.
- Las fórmulas de la sección 6 son normativas: impleméntalas literalmente. Son el corazón del sistema y donde está el valor diferencial.
- Antes de escribir código, lee las secciones 5 (modelo de datos) y 6 (reglas de negocio) completas. El resto depende de ellas.

---

## 1. Contexto y objetivo

Normchi es un restaurante. Hoy no tiene trazabilidad entre lo que compra, lo que tiene en bodega y lo que vende. El objetivo es una aplicación web que cierre ese ciclo completo:

```
Compras  →  Inventario  →  Recetas (BOM)  →  Ventas
                 ↑                              ↓
                 └──────  Planificación  ───────┘
                        (pronóstico + MRP)
```

Preguntas de negocio que el sistema debe responder, sin que nadie tenga que abrir una planilla:

1. ¿Cuánto gasté en materia prima este mes, por proveedor y por categoría?
2. ¿Cuánto tengo en bodega ahora mismo, y cuánto vale?
3. ¿Cuánto cuesta realmente cada plato del menú y cuánto margen deja?
4. ¿Qué platos son los que más venden y cuáles son los que más aportan al resultado? (no son los mismos)
5. ¿Cuánto voy a vender las próximas 2 semanas?
6. Dado ese pronóstico, ¿qué insumos me van a faltar, cuándo, y cuánto tengo que comprar?
7. ¿Cuántos minutos de cocina requiere la demanda pronosticada? ¿Me alcanza la dotación?
8. ¿Cuál es la utilidad proyectada del período?

---

## 2. Alcance

### En alcance (MVP)

| Módulo | Contenido |
|---|---|
| Maestro de insumos | Materias primas con unidad base, unidad de compra, factor de conversión, merma, lead time, stock de seguridad, proveedor |
| Maestro de proveedores | Datos de contacto, condiciones, lead time por defecto |
| Recetas (BOM) | Producto final → lista de insumos con cantidades + tiempo de preparación |
| Compras | Órdenes de compra con estado (pendiente / recibida / anulada), recepción que impacta stock y costo |
| Inventario | Ledger de movimientos, stock actual, valorización a costo medio móvil, ajustes y mermas |
| Ventas | **El sistema es el registro oficial de ventas del restaurante.** Carga diaria manual o por CSV, consumo automático de insumos por explosión de BOM, y es la única fuente de datos del pronóstico |
| Planificación | Pronóstico de demanda por producto, MRP de insumos, sugerencia de compra, carga de cocina |
| Reportería | Gasto en compras, margen por producto, matriz de menu engineering, utilidad proyectada |

### Fuera de alcance en esta iteración

- **[FUERA DE ALCANCE]** Integración en línea con POS o boleta electrónica (SII). Se cubre con carga CSV.
- **[FUERA DE ALCANCE]** Contabilidad, nómina, facturación a clientes.
- **[FUERA DE ALCANCE]** Multi-local / multi-bodega. El modelo debe dejar el campo `local_id` preparado, pero la UI asume un único local.
- **[FUERA DE ALCANCE]** Trazabilidad por lote y fecha de vencimiento (FEFO). Ver sección 12, fase 3.
- **[FUERA DE ALCANCE]** App móvil nativa. La web debe ser responsive y usable desde teléfono en bodega.

---

## 3. Supuestos a confirmar

Impleméntalos así; están todos parametrizados para poder cambiarse sin tocar código.

| # | Supuesto | Valor por defecto |
|---|---|---|
| S1 | Moneda y localización | CLP, `es-CL`, sin decimales en pesos, zona horaria `America/Santiago` |
| S2 | Un solo local, una sola bodega | `local_id = 1` |
| S3 | Las ventas se registran en este sistema, no en otro. Se cargan por día agregado, no por transacción individual | Un registro de venta por día, canal y producto |
| S4 | El consumo de insumos es teórico (*backflush* por receta), no por pesaje real | Diferencia real vs teórica se corrige con ajustes de inventario |
| S5 | Valorización de inventario | Costo medio móvil ponderado (no FIFO ni PEPS por lote) |
| S6 | Horizonte de planificación | 14 días |
| S7 | Ventana histórica para pronóstico | 56 días (8 semanas) |
| S8 | Capacidad de cocina | 480 minutos-persona/día |
| S9 | Los precios de venta incluyen IVA | Se configura una tasa (19%) y los reportes de margen usan valores netos |
| S10 | Usuarios | 1–8 usuarios del mismo restaurante, con roles |
| S11 | Categorías de producto vendible | Solo dos: `comida` y `bebida`. Es un enum cerrado, no texto libre |
| S12 | Existen productos de reventa directa (bebida embotellada que se compra y se vende sin transformación) | Se modelan con una receta de una sola línea. Ver 6.4.1 |

---

## 4. Stack técnico

**[SUPUESTO]** Elección tomada por defecto, priorizando velocidad de desarrollo y despliegue barato.

- **Framework:** Next.js 15 (App Router) + TypeScript en modo estricto
- **UI:** Tailwind CSS + shadcn/ui
- **Gráficos:** Recharts
- **Base de datos:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (email + contraseña), con tabla `usuarios` propia para roles
- **Validación:** Zod en cada borde (formularios, server actions, endpoints)
- **Fechas:** `date-fns` con `date-fns-tz`. **Prohibido** usar `Date.toISOString()` para obtener una fecha local — desfasa un día en zona horaria negativa. Usa un helper `toFechaLocal(date): string` que formatee `YYYY-MM-DD` con getters locales.
- **Despliegue:** Vercel + Supabase
- **Tests:** Vitest para la capa de cálculo (secciones 6.2 a 6.9). Esta capa debe ser funciones puras testeables, **independientes de la base de datos y de React**, en `src/lib/motor/`.

### Reglas de arquitectura no negociables

1. Toda la lógica de la sección 6 vive en `src/lib/motor/` como funciones puras: reciben datos, devuelven resultados. Sin llamadas a DB, sin hooks.
2. El stock **nunca se guarda como campo mutable**. Se deriva del ledger de movimientos (sección 6.3). Puede existir una tabla materializada `stock_actual` como caché, pero se recalcula desde el ledger y debe existir un comando `recalcular-inventario` que la reconstruya desde cero.
3. Los montos monetarios se guardan como `Decimal(14,4)` en la base y se operan con `Prisma.Decimal` o `decimal.js`. **Nunca** aritmética de punto flotante para dinero.
4. Las cantidades de insumo se guardan **siempre en unidad base**. La conversión desde unidad de compra ocurre en el borde de entrada, nunca en el medio del cálculo.

---

## 5. Modelo de datos

### 5.1 Diagrama de relaciones

```
proveedores ──< insumos ──< receta_lineas >── productos
                  │                              │
                  ├──< compra_lineas >── compras │
                  ├──< movimientos_inventario    │
                  └──< ajustes_inventario        │
                                                 │
                              venta_lineas >── ventas
```

### 5.2 Tablas

#### `usuarios`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| nombre | text | |
| rol | enum | `admin` \| `compras` \| `cocina` \| `cajero` \| `lectura` |
| activo | boolean | default true |

Permisos por rol:
- `admin`: todo, incluida configuración y borrado.
- `compras`: insumos, proveedores, compras, recepciones, ajustes. Lectura del resto.
- `cocina`: recetas, ajustes de inventario (mermas), lectura de planificación.
- `cajero`: registro de ventas. Lectura del panel.
- `lectura`: solo lectura.

#### `proveedores`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| contacto, telefono, email | text nullable | |
| lead_time_dias | int | default 3. Se usa como valor por defecto al crear insumos |
| condicion_pago | text nullable | ej. "30 días" |
| activo | boolean | |

#### `insumos`
Materias primas e insumos de bodega.

| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| codigo | text unique | código interno, editable |
| nombre | text | |
| categoria | text | ej. Carnes, Verduras, Abarrotes, Lácteos, Bebidas, Desechables |
| unidad_base | enum | `g` \| `ml` \| `un`. **Toda cantidad interna usa esta unidad** |
| unidad_compra | text | ej. "kg", "caja 12 un", "bidón 5 L" |
| factor_conversion | decimal | cuántas unidades base trae una unidad de compra. Ej: kg → 1000 g |
| merma_pct | decimal | 0 a 1. Pérdida por limpieza, pelado, corte. Ver 6.5 |
| stock_seguridad | decimal | en unidad base |
| lote_minimo_compra | decimal | en unidad de compra. Default 1 |
| lead_time_dias | int | |
| proveedor_id | FK nullable | proveedor preferente |
| perecible | boolean | informativo en MVP |
| stock_inicial | decimal | en unidad base, para la carga inicial |
| costo_inicial | decimal(14,4) | por unidad base |
| activo | boolean | |

**Regla:** `unidad_base` no se puede cambiar una vez que el insumo tiene movimientos. Bloquear en UI y con constraint en la capa de servicio.

#### `productos`
Platos y bebidas que se venden.

| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| codigo | text unique | |
| nombre | text | |
| categoria | enum | **`comida` \| `bebida`.** Enum cerrado. Todo reporte y filtro del sistema debe poder segmentar por este campo |
| subcategoria | text nullable | Texto libre para cuando el menú crezca (ej. Entradas, Fondos, Postres, Jugos, Cervezas). No se usa en la lógica, solo para agrupar en reportes |
| es_reventa | boolean | default false. `true` cuando el producto se compra y se vende sin transformación. Ver 6.4.1 |
| precio_venta | decimal(14,4) | precio de carta, con IVA si S9 |
| tiempo_preparacion_min | decimal | minutos-persona para producir 1 unidad. En reventa suele ser 0,5 o 1 (servir) |
| estacion | text nullable | ej. Parrilla, Freidora, Barra. Permite capacidad por estación en fase 2 |
| activo | boolean | |

#### `receta_lineas` (BOM)
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| producto_id | FK | |
| insumo_id | FK | |
| cantidad | decimal | en unidad base del insumo, **por 1 unidad de producto** |
| nota | text nullable | ej. "porción de 150 g" |

**Restricción:** único por (`producto_id`, `insumo_id`).
**[FUERA DE ALCANCE]** Sub-recetas / BOM multinivel (ej. una salsa que es a la vez producto intermedio). Ver fase 3.

#### `compras` (cabecera)
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| folio | text | correlativo generado, ej. `OC-2026-0042` |
| proveedor_id | FK | |
| fecha_emision | date | |
| fecha_esperada | date | fecha estimada de recepción. **Clave para el MRP** |
| fecha_recepcion | date nullable | |
| estado | enum | `borrador` \| `pendiente` \| `recibida` \| `anulada` |
| documento | text nullable | número de factura o guía |
| nota | text nullable | |

#### `compra_lineas`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| compra_id | FK | |
| insumo_id | FK | |
| cantidad_compra | decimal | en **unidad de compra** |
| precio_unitario_compra | decimal(14,4) | por **unidad de compra**, neto |
| cantidad_recibida_compra | decimal nullable | permite recepción parcial o distinta a la pedida |

Derivados (no se guardan, se calculan):
- `cantidad_base = cantidad_recibida_compra ?? cantidad_compra) × factor_conversion`
- `costo_unitario_base = precio_unitario_compra / factor_conversion`
- `total_linea = cantidad_compra × precio_unitario_compra`

#### `ventas` (cabecera)
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| fecha | date | |
| canal | enum | `salon` \| `delivery` \| `retiro` |
| origen | enum | `manual` \| `csv` |
| nota | text nullable | |

#### `venta_lineas`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| venta_id | FK | |
| producto_id | FK | |
| cantidad | decimal | |
| precio_unitario | decimal(14,4) | precio efectivamente cobrado; puede diferir del de carta por promociones |

#### `ajustes_inventario`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| fecha | date | |
| insumo_id | FK | |
| cantidad_delta | decimal | en unidad base. Negativo = merma / pérdida, positivo = hallazgo en conteo |
| motivo | enum | `conteo_fisico` \| `merma` \| `vencimiento` \| `error_registro` \| `otro` |
| nota | text nullable | |
| usuario_id | FK | |

#### `movimientos_inventario` (ledger derivado)
Tabla materializada, reconstruible. Un registro por cada impacto de stock.

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| fecha | date | |
| secuencia | int | orden dentro del día, ver 6.3 |
| insumo_id | FK | |
| tipo | enum | `entrada_compra` \| `consumo_venta` \| `ajuste` \| `saldo_inicial` |
| origen_tabla | text | `compras` \| `ventas` \| `ajustes_inventario` |
| origen_id | bigint | |
| cantidad | decimal | en unidad base. Positivo entrada, negativo salida |
| costo_unitario | decimal(14,4) | costo unitario **aplicado** en este movimiento |
| costo_medio_resultante | decimal(14,4) | costo medio del insumo después del movimiento |
| stock_resultante | decimal | stock después del movimiento |

#### `parametros`
Tabla clave-valor tipada, editable desde la UI de Configuración.

| Clave | Default | Descripción |
|---|---|---|
| `moneda` | `CLP` | |
| `iva_pct` | `0.19` | |
| `precios_incluyen_iva` | `true` | |
| `horizonte_planificacion_dias` | `14` | |
| `ventana_historial_dias` | `56` | |
| `alpha_suavizamiento` | `0.30` | Ver 6.6 |
| `capacidad_minutos_dia` | `480` | |
| `costos_fijos_diarios` | `0` | Arriendo, sueldos, servicios prorrateados por día |
| `dias_operacion_semana` | `[1,2,3,4,5,6]` | 0 = domingo |

---

## 6. Reglas de negocio y fórmulas

Esta sección es normativa. Cada subsección debe tener su función pura correspondiente en `src/lib/motor/` con tests unitarios.

### 6.1 Unidades y conversión

Tres unidades base: `g` (masa), `ml` (volumen), `un` (unidades discretas). Toda cantidad persistida internamente está en unidad base.

```
cantidad_base = cantidad_compra × factor_conversion
costo_por_unidad_base = precio_unitario_compra / factor_conversion
```

Ejemplo: se compran 3 sacos de harina de 25 kg a $18.000 el saco.
`unidad_base = g`, `unidad_compra = "saco 25 kg"`, `factor_conversion = 25000`.
→ `cantidad_base = 75.000 g`, `costo_por_unidad_base = 0,72 $/g`.

En la UI, mostrar siempre la magnitud legible: si `unidad_base = g` y la cantidad ≥ 1000, mostrar en kg. Idem `ml` → L. Esto es solo presentación; el dato subyacente no cambia.

### 6.2 Valorización de inventario: costo medio móvil ponderado

Al recibir una entrada de cantidad `q` a costo unitario `c`:

```
stock_previo_positivo = max(stock_previo, 0)

si stock_previo_positivo + q > 0:
    costo_medio_nuevo = (stock_previo_positivo × costo_medio_previo + q × c)
                        / (stock_previo_positivo + q)
si no:
    costo_medio_nuevo = c

stock_nuevo = stock_previo + q
```

Los consumos y los ajustes **no modifican el costo medio**, solo el stock.

**Caso borde obligatorio:** si el stock es negativo (se vendió más de lo que había registrado) y llega una compra, el costo medio se toma directamente de la compra, sin promediar contra un stock negativo. El test debe cubrirlo.

### 6.3 Ledger de movimientos

El stock y el costo se derivan procesando todos los eventos en orden cronológico. Nunca se actualizan de forma incremental "en caliente".

**Orden dentro de un mismo día** (campo `secuencia`):

| Secuencia | Tipo |
|---|---|
| 0 | `saldo_inicial` |
| 1 | `entrada_compra` |
| 2 | `ajuste` |
| 3 | `consumo_venta` |

Racional: las compras del día están disponibles para el consumo del mismo día; los ajustes de conteo se aplican antes de descontar el consumo teórico.

**Función:** `recalcularLedger(insumos, compras, ventas, ajustes, recetas): ResultadoLedger`

Devuelve: movimientos ordenados, stock y costo medio final por insumo, y COGS (costo de venta) por día y por producto.

**Disparadores de recálculo:** crear, editar, anular o borrar cualquier compra, venta o ajuste. En un dataset de un restaurante (miles de registros) el recálculo completo es de milisegundos; no optimizar prematuramente. Si el volumen crece, recalcular solo desde la fecha del evento modificado hacia adelante.

### 6.4 Costeo de recetas

```
costo_teorico_producto = Σ_i ( cantidad_receta[i] × (1 + merma_pct[i]) × costo_medio[i] )

margen_contribucion_unitario = precio_venta_neto − costo_teorico_producto
margen_pct = margen_contribucion_unitario / precio_venta_neto
food_cost_pct = costo_teorico_producto / precio_venta_neto
```

Donde `precio_venta_neto = precio_venta / (1 + iva_pct)` si `precios_incluyen_iva = true`, en caso contrario `precio_venta`.

En la ficha del producto, mostrar el desglose línea a línea: insumo, cantidad, merma aplicada, costo unitario, costo total, y **% de participación en el costo del plato**. Ese último dato es el que permite ver qué ingrediente está encareciendo un plato.

Semáforo de food cost: verde < 30%, ámbar 30–38%, rojo > 38%. **[SUPUESTO]**, parametrizable.

#### 6.4.1 Productos de reventa directa

Caso típico en bebidas: una botella de bebida se compra en caja de 12, se guarda en bodega y se vende tal cual. El producto vendible y el insumo comprado son el mismo objeto físico.

**No crear un modelo aparte.** Se resuelve con el modelo existente:

- Se crea el **insumo** `Bebida 350 ml`, con `unidad_base = un`, `unidad_compra = "caja 12 un"`, `factor_conversion = 12`, `merma_pct = 0`.
- Se crea el **producto** `Bebida 350 ml`, con `categoria = bebida`, `es_reventa = true`, y una **receta de una sola línea**: 1 unidad de ese insumo.

Con eso, la compra alimenta el stock, la venta lo descuenta por backflush, el costo medio móvil funciona igual y el margen sale correcto sin ninguna lógica especial.

Lo que sí debe cambiar es la **UI**: cuando se marca `es_reventa = true` en un producto nuevo, ofrecer crear el insumo espejo automáticamente y enlazar la receta de una línea, en un solo paso. Si se obliga al usuario a hacerlo a mano cada vez, no lo va a hacer y las bebidas van a quedar fuera del control de inventario — que es justo donde más se pierde plata en un restaurante.

Un producto con `es_reventa = true` debe validar que su receta tenga exactamente una línea, con cantidad 1 y merma 0. Si no cumple, advertir sin bloquear.

### 6.5 Consumo por venta (backflush)

Al registrar la venta de `n` unidades del producto `p`:

```
para cada línea de receta i de p:
    consumo_base[i] = n × cantidad_receta[i] × (1 + merma_pct[i])
    generar movimiento tipo consumo_venta con cantidad = −consumo_base[i]
                                              costo_unitario = costo_medio[i] vigente
```

El COGS de esa línea de venta es la suma de `consumo_base[i] × costo_medio[i]`. Usar el costo vigente **en la fecha del movimiento**, no el actual — por eso el ledger es cronológico.

**Limitación conocida y a documentar en la UI:** si la receta se modifica hoy, el recálculo del ledger aplicará la receta nueva a las ventas históricas. Es una aproximación aceptable en el MVP. Mostrar una nota en la pantalla de recetas: *"Cambiar una receta recalcula el consumo histórico. Los costos de períodos ya cerrados pueden variar."* La solución correcta (versionado de recetas con vigencia) queda en fase 3.

**Stock negativo:** se permite, no se bloquea la venta. Se marca el insumo con una alerta "consumo sin respaldo de stock", que normalmente indica una compra no registrada.

### 6.6 Pronóstico de demanda

Modelo: **nivel con suavizamiento exponencial simple + índice de estacionalidad semanal**. Es un Holt-Winters aditivo simplificado sin tendencia. Se eligió porque en restaurantes el patrón dominante es el día de la semana (viernes y sábado pueden triplicar un martes), y porque es explicable ante el usuario: cada número del pronóstico se puede descomponer en "nivel base × factor del día".

**Fuente de datos:** exclusivamente las ventas registradas en el módulo de la sección 7.6. No hay otra entrada. Esto tiene una consecuencia operativa que debe quedar visible en la interfaz: **cada día sin registrar es un cero que el modelo interpreta como "no se vendió nada"** y que degrada el pronóstico. Ver la regla de días faltantes más abajo.

El pronóstico se calcula a **nivel de producto**. Adicionalmente, agregar los resultados a nivel de categoría (`comida` y `bebida`) para dos usos: control de coherencia — la suma de los productos debe cuadrar con el total — y lectura de negocio, porque las dos categorías tienen comportamientos y márgenes distintos y conviene verlas por separado en el panel.

Por cada producto activo, sobre la ventana histórica `H` (default 56 días):

**Paso 1 — Serie diaria.** Construir `u_t` para cada día del período. Hay que distinguir tres situaciones y tratarlas distinto:

| Situación | Cómo detectarla | Tratamiento |
|---|---|---|
| Día operado y registrado, el producto no se vendió | Existe al menos un registro de venta con esa fecha, pero ninguna línea de este producto | `u_t = 0`. **Es información válida** y entra al modelo |
| Día no operado | La fecha cae fuera de `dias_operacion_semana`, o está marcada como cierre | Se excluye de la serie. No es un cero |
| Día operado pero no registrado | No existe ningún registro de venta con esa fecha y el día sí es operativo | **Se excluye de la serie** y se cuenta como brecha de registro |

La tercera fila es la importante. Un día sin registrar tratado como cero contamina el nivel y los índices de estacionalidad, y el usuario nunca sabría por qué el pronóstico bajó. Por eso: se excluye del cálculo, pero **se reporta**. En la pantalla de planificación mostrar un indicador permanente:

```
Cobertura de registro: 48 de 56 días operativos   (86%)
8 días sin registrar — el pronóstico los ignora   [ver cuáles]
```

Si la cobertura baja del 70%, degradar el nivel de confianza a `baja` sin importar el WAPE, y mostrar la advertencia en el panel principal.

**Paso 2 — Promedio.**
```
μ = (Σ u_t) / H
si μ ≤ 0 → pronóstico = 0 para todo el horizonte, confianza = "sin datos"
```

**Paso 3 — Índices de estacionalidad semanal.** Para cada día de la semana `d` (0=domingo .. 6=sábado), con `n_d` observaciones:
```
I_d_crudo = promedio(u_t donde dow(t) = d) / μ
I_d_acotado = clamp(I_d_crudo, 0.25, 2.50)

# Contracción hacia 1 cuando hay pocas muestras
w_d = min(1, n_d / 4)
I_d_suave = w_d × I_d_acotado + (1 − w_d) × 1

# Normalización: el promedio de los 7 índices debe ser 1
I_d = I_d_suave × 7 / (Σ_d I_d_suave)
```

**Paso 4 — Nivel por suavizamiento exponencial sobre la serie desestacionalizada.**
```
L_0 = μ
para t = 1..H:
    L_t = α × (u_t / I_dow(t)) + (1 − α) × L_(t−1)
```
Con `α = 0.30` por defecto (parámetro `alpha_suavizamiento`).

**Paso 5 — Pronóstico.**
```
F(fecha) = max(0, L_H × I_dow(fecha))
```

**Confianza del pronóstico.** Calcular y mostrar siempre. Tres niveles:
- `alta`: ≥ 42 días con datos y WAPE de backtesting < 25%
- `media`: ≥ 21 días con datos
- `baja`: < 21 días con datos, **o cobertura de registro < 70%** → usar promedio simple de los días con venta y marcarlo visiblemente

**Backtesting obligatorio.** Reservar los últimos 14 días como holdout, ajustar el modelo con el resto y calcular:
```
WAPE = Σ|real − pronosticado| / Σ real
```
Mostrar el WAPE por producto en la pantalla de planificación. Un pronóstico sin métrica de error no sirve para tomar decisiones y el usuario debe poder ver cuánto confiar en él.

**Ajuste manual.** El usuario debe poder sobrescribir el pronóstico de un producto para un rango de fechas (ej. evento, feriado, promoción). Tabla `forecast_overrides` con (`producto_id`, `fecha`, `cantidad`, `motivo`). El override tiene precedencia absoluta sobre el modelo y se marca visualmente en los gráficos.

### 6.7 MRP: requerimientos y sugerencia de compra

Por cada insumo `i` y cada día `t` del horizonte:

```
# Requerimiento bruto: explosión del pronóstico contra la BOM
R[i,t] = Σ_p ( F(p,t) × cantidad_receta[p,i] × (1 + merma_pct[i]) )

# Entradas programadas: compras en estado pendiente con fecha_esperada = t
E[i,t] = Σ ( cantidad_base de líneas de compra pendientes con esa fecha )

# Disponibilidad proyectada
D[i,0] = stock_actual[i]
D[i,t] = D[i,t−1] + E[i,t] − R[i,t]
```

**Fecha de quiebre:** el primer `t` donde `D[i,t] < stock_seguridad[i]`.
Si no existe en el horizonte, el insumo está cubierto.

**Fecha sugerida de pedido:**
```
fecha_pedido = fecha_quiebre − lead_time_dias[i]
si fecha_pedido ≤ hoy → marcar como URGENTE
```

**Cantidad a comprar:**
```
necesidad_neta = Σ_(t=1..H) R[i,t] + stock_seguridad[i] − stock_actual[i] − Σ_t E[i,t]

si necesidad_neta ≤ 0 → no sugerir compra

cantidad_en_unidad_compra = ceil( necesidad_neta / factor_conversion[i] )
cantidad_final = max(cantidad_en_unidad_compra, lote_minimo_compra[i])

costo_estimado = cantidad_final × costo_medio[i] × factor_conversion[i]
```

**Salida:** una tabla de sugerencia de compra agrupada por proveedor, con checkboxes, desde la cual se genera una orden de compra en estado `borrador` con un solo clic. Esta es la funcionalidad de mayor valor práctico del sistema; cuidar su UX.

Columnas de la tabla: insumo, stock actual, requerimiento del horizonte, cobertura en días, fecha de quiebre, pedir antes de, cantidad sugerida (editable), unidad de compra, costo estimado, proveedor.

**Cobertura en días** = `stock_actual / (requerimiento_total_horizonte / H)`. Es la métrica que el usuario va a mirar primero.

### 6.8 Carga de cocina (capacidad aproximada)

```
carga_minutos[t] = Σ_p ( F(p,t) × tiempo_preparacion_min[p] )
utilizacion[t] = carga_minutos[t] / capacidad_minutos_dia
```

Mostrar como gráfico de barras por día con una línea de referencia en la capacidad. Marcar en rojo los días con utilización > 100% y en ámbar > 85%.

Si el campo `estacion` está poblado en los productos, desagregar la carga también por estación. Un día puede estar al 70% global pero con la freidora al 130%; ese es el cuello de botella real.

### 6.9 Menu engineering y rentabilidad

Clasificación clásica de Kasavana-Smith sobre un período seleccionable (default: últimos 30 días).

```
n = número de productos vendidos en el período
popularidad[p] = unidades_vendidas[p] / total_unidades
umbral_popularidad = (1 / n) × 0.70

margen_contribucion[p] = precio_promedio_neto[p] − costo_teorico[p]
umbral_margen = margen_contribución promedio ponderado por unidades vendidas
```

| Cuadrante | Popularidad | Margen | Nombre en UI | Acción sugerida (mostrar en la tarjeta) |
|---|---|---|---|---|
| Estrella | Alta | Alto | **Estrella** | Mantener receta y calidad. No tocar el precio a la baja |
| Caballo de batalla | Alta | Bajo | **Caballo de batalla** | Revisar costo de insumos o subir precio con cuidado |
| Rompecabezas | Baja | Alto | **Rompecabezas** | Promover, reubicar en la carta, sugerir en salón |
| Perro | Baja | Bajo | **Perro** | Candidato a salir de la carta |

Visualización: gráfico de dispersión con popularidad en X, margen unitario en Y, líneas de referencia en los umbrales, tamaño del punto proporcional al margen total aportado. Bajo el gráfico, una tabla ordenable con los mismos datos.

**Nota importante para la UI:** "el producto que más vende" y "el producto que más aporta" casi nunca son el mismo. El panel debe mostrar ambos rankings por separado y nombrarlos con precisión: *"Más vendidos (unidades)"* y *"Mayor aporte al margen ($)"*.

### 6.10 Utilidad proyectada

```
margen_bruto_proyectado = Σ_p Σ_(t=1..H) ( F(p,t) × margen_contribucion_unitario[p] )
utilidad_proyectada = margen_bruto_proyectado − (costos_fijos_diarios × H)
punto_equilibrio_diario = costos_fijos_diarios / margen_contribucion_promedio_ponderado
```

Mostrar el punto de equilibrio en unidades y en ingresos por día, comparado contra la venta promedio real. Es el número que un dueño de restaurante quiere ver primero.

---

## 7. Pantallas y flujos

### 7.1 Estructura de navegación

```
/                    Panel
/insumos             Maestro de insumos + stock
/insumos/[id]        Ficha: datos, movimientos, gráfico de stock proyectado
/recetas             Lista de productos
/recetas/[id]        Editor de BOM + costeo en vivo + tiempo de preparación
/compras             Lista de órdenes de compra
/compras/nueva       Crear orden
/compras/[id]        Detalle y recepción
/ventas              Registro de ventas
/ventas/importar     Carga CSV
/inventario          Ledger de movimientos + ajustes + conteo físico
/planificacion       Pronóstico, MRP, sugerencia de compra, carga de cocina
/reportes            Menu engineering, gasto en compras, márgenes, utilidad proyectada
/configuracion       Parámetros, proveedores, usuarios, respaldo
```

### 7.2 Panel (`/`)

Fila de indicadores del período seleccionable (hoy / 7 días / 30 días / mes actual):

1. Ventas netas
2. Costo de materia prima (COGS real del ledger) y food cost %
3. Margen bruto
4. Valor del inventario a costo medio
5. Compras del período
6. Utilidad estimada (margen − costos fijos prorrateados)

Cada indicador de venta, costo y margen debe mostrar el **desglose comida / bebida**. En restaurantes las bebidas suelen tener un food cost muy inferior al de la comida, así que el margen global promediado esconde información: puede caer porque bajó el mix de bebidas y no porque subieran los insumos. Mostrar también el **mix**: qué porcentaje del ingreso viene de cada categoría, y su variación contra el período anterior.

Debajo:
- Gráfico de línea: ventas diarias reales + pronóstico de los próximos 14 días como línea punteada, en el mismo eje. Es la vista que conecta pasado y futuro.
- **Alertas accionables**, ordenadas por urgencia. Cada una con un enlace directo a la acción:
  - Insumos bajo stock de seguridad
  - Insumos con quiebre proyectado dentro del lead time (URGENTE)
  - Insumos con stock negativo (indica compras no registradas)
  - Recepciones pendientes con fecha esperada vencida
  - Productos con food cost sobre el umbral
  - Días con cocina sobre capacidad en el horizonte

El panel vacío (instalación nueva) no debe mostrar ceros: debe mostrar una guía de tres pasos — cargar insumos, cargar recetas, registrar la primera venta — con enlaces.

### 7.3 Insumos

Tabla con: código, nombre, categoría, stock actual (en unidad legible), stock de seguridad, cobertura en días, costo medio, valor en bodega, proveedor, estado.

Indicador de estado por fila: verde (sobre stock de seguridad), ámbar (bajo stock de seguridad), rojo (quiebre proyectado dentro del lead time), negro (stock negativo).

Filtros por categoría, proveedor y estado. Búsqueda por nombre y código.

Ficha del insumo: datos maestros, gráfico de evolución de stock (histórico real + proyección del MRP con línea de stock de seguridad), tabla de movimientos con paginación, y la lista de productos que lo consumen (uso inverso de la BOM — útil para saber qué platos se caen si falta este insumo).

### 7.4 Recetas

Editor de BOM con costeo en vivo: al cambiar una cantidad, el costo del plato, el margen y el food cost se recalculan sin recargar.

Panel lateral fijo mientras se edita:
```
Precio de venta          $ 7.900
Precio neto              $ 6.639
Costo teórico            $ 2.180   ← se actualiza al escribir
Margen unitario          $ 4.459
Food cost                  32,8%   ← semáforo ámbar
Tiempo de preparación      8 min
```

Bajo la lista de insumos, la participación de cada uno en el costo del plato como barra horizontal.

Función **duplicar receta**: crear una variante a partir de una existente (hamburguesa clásica → hamburguesa doble) es un caso frecuente.

### 7.5 Compras

Flujo: `borrador` → `pendiente` (enviada al proveedor) → `recibida`.

La recepción es una pantalla aparte, no un botón: permite ajustar cantidad recibida por línea (puede diferir de lo pedido), corregir el precio si la factura vino distinta, y fijar la fecha de recepción. Solo al confirmar la recepción se generan los movimientos de inventario.

Recepción parcial: **[SUPUESTO]** en el MVP se recibe todo o nada, pero con cantidades editables. Si se recibió menos, se registra la cantidad real y la orden se cierra; lo faltante se pide en una orden nueva.

### 7.6 Ventas

Este módulo es el sistema de registro de ventas del restaurante y la única fuente que alimenta el pronóstico, el consumo de inventario y todos los reportes de margen. Si esta pantalla es incómoda, el resto del sistema no sirve. Es la pantalla más importante del producto y debe recibir el mayor esfuerzo de UX.

**Meta de diseño explícita: cargar el día completo en menos de 2 minutos, solo con teclado.**

#### Cierre de día (modo principal)

Una pantalla, un día. Selector de fecha arriba, por defecto hoy. El cuerpo es una tabla con **todos los productos activos**, agrupados en dos bloques con encabezado:

```
COMIDAS
  Hamburguesa clásica      $ 7.900   [   18 ]
  Hamburguesa doble       $ 10.900   [    9 ]
  Pollo a la plancha       $ 8.900   [   11 ]
  Papas fritas             $ 3.500   [   26 ]

BEBIDAS
  Limonada                 $ 2.500   [   20 ]
  Bebida 350 ml            $ 1.800   [   31 ]
```

Comportamiento:
- Los campos vienen vacíos, no en cero. Un campo vacío al guardar significa "no vendí este producto hoy" y se persiste como cero de forma explícita, para que el día quede marcado como registrado.
- `Tab` avanza al siguiente producto, `Shift+Tab` retrocede. `Enter` también avanza. `Ctrl+Enter` guarda.
- Selector de canal (`salon` / `delivery` / `retiro`) en la cabecera. **[SUPUESTO]** un canal por carga; si venden por varios canales el mismo día, se hacen dos cargas del mismo día.
- El precio unitario se precarga del maestro y es editable por línea, para promociones o precios distintos por canal.
- Totales en vivo al pie, separados por categoría: unidades, ingreso, y margen estimado.

#### Marcar día sin operación

Un botón "El local no abrió este día" que registra el cierre sin ventas. Esto es lo que permite al pronóstico distinguir un feriado de un día que nadie registró (sección 6.6, paso 1). Tabla `dias_cierre` con (`fecha`, `motivo`, `usuario_id`).

#### Historial y edición

Lista de días con: fecha, canal, unidades por categoría, ingreso, margen, y estado de registro. Un calendario mensual con los días sin registrar marcados en rojo, para que la brecha sea evidente de un vistazo y se pueda hacer clic para completarla.

Editar un día ya registrado es válido y dispara el recálculo del ledger (sección 6.3).

#### Carga CSV

Columnas: `fecha,codigo_producto,cantidad,precio_unitario,canal`. Vista previa antes de confirmar, con validación por fila y reporte de errores (producto inexistente, fecha inválida, cantidad no numérica, canal desconocido). Las filas válidas se importan aunque otras fallen. Útil para la carga inicial del histórico o si más adelante se exporta desde un POS.

#### Retroalimentación inmediata al guardar

Al confirmar el día, mostrar en un panel de resumen:
- Ingreso, costo de materia prima y margen del día, desglosado en comidas y bebidas
- Insumos que quedaron bajo stock de seguridad producto de este consumo, con enlace a la sugerencia de compra
- Comparación contra el pronóstico de ese día: cuánto se esperaba vs cuánto se vendió, con la desviación en porcentaje

Ese último punto es el que hace que el usuario le tome confianza al pronóstico o descubra que no le sirve. Sin ese contraste visible, el módulo de planificación queda como una caja negra.

### 7.7 Planificación

Tres bloques en una sola página, en este orden:

1. **Pronóstico de demanda.** Tabla por producto con el pronóstico diario del horizonte, total, WAPE, y nivel de confianza. Gráfico de la serie histórica y el pronóstico. Botón para ajustar manualmente.
2. **Sugerencia de compra (MRP).** La tabla de la sección 6.7, agrupada por proveedor, con generación de orden de compra en borrador.
3. **Carga de cocina.** El gráfico de la sección 6.8.

Un selector de horizonte (7 / 14 / 28 días) en la parte superior afecta a los tres bloques.

### 7.8 Reportes

- Matriz de menu engineering (6.9), con filtro por categoría y la opción de calcular los umbrales **dentro de cada categoría**, no sobre el total. Una bebida y un plato de fondo no compiten en el mismo cuadrante: comparados juntos, casi toda bebida sale "estrella" por margen porcentual y casi todo plato sale "caballo de batalla". El default debe ser el cálculo segmentado
- Ranking de productos: más vendidos vs mayor aporte al margen, lado a lado, con corte por categoría
- Evolución del mix comida / bebida en el tiempo, con el margen de cada categoría sobre el mismo gráfico
- Cobertura de registro de ventas por mes, para auditar la disciplina de carga
- Gasto en compras por período, con desglose por proveedor y por categoría
- Evolución del costo medio de los insumos principales (detecta alzas de proveedores)
- Comparación consumo teórico vs ajustes de inventario: la diferencia acumulada por insumo es el indicador de merma real no contabilizada, robo o error de porcionamiento. **Este reporte es de alto valor y suele omitirse; inclúyelo.**
- Utilidad proyectada y punto de equilibrio (6.10)

Exportación a CSV en todos los reportes.

---

## 8. Consideraciones no funcionales

- **Responsive.** La pantalla de conteo físico y la de recepción de compras se usan desde un teléfono, en bodega, posiblemente con mala señal. Prioriza esas dos para móvil.
- **Accesibilidad.** Foco de teclado visible, contraste AA, formularios navegables solo con teclado. El registro de ventas debe ser 100% operable sin mouse.
- **Idioma.** Toda la interfaz en español de Chile. Sin anglicismos innecesarios: "stock de seguridad" no "safety stock", "pronóstico" no "forecast", "orden de compra" no "PO".
- **Formato de números.** Pesos sin decimales con separador de miles (`$ 7.900`). Cantidades con hasta 2 decimales. Porcentajes con 1 decimal.
- **Auditoría.** Cada tabla transaccional lleva `creado_por`, `creado_en`, `actualizado_por`, `actualizado_en`. Los registros no se borran físicamente: `anulado` + `anulado_motivo`.
- **Respaldo.** Botón en Configuración para exportar toda la base como JSON, y una función de importación que reemplaza el contenido con confirmación explícita.
- **Semillas.** Incluir un script `npm run seed` con datos de demostración: ~14 insumos, 4 proveedores, 8 productos con recetas completas (6 de categoría `comida` y 2 de `bebida`, de los cuales **uno debe ser de reventa directa** para ejercitar el caso de la sección 6.4.1), 8 semanas de ventas sintéticas con estacionalidad semanal realista (viernes y sábado altos, lunes bajo) y algo de ruido, 3 o 4 días operativos deliberadamente sin registrar para probar la lógica de cobertura, 2 días marcados como cierre, y 5 compras históricas. Sin esto no se puede evaluar el pronóstico ni el MRP durante el desarrollo. Marcar los registros con `es_demo = true` y ofrecer un botón "Borrar datos de demostración".

---

## 9. Criterios de aceptación

Cada uno debe tener un test automatizado en la capa de motor o un test de integración.

### Inventario y costeo
1. Compra de 10 kg de un insumo con `unidad_base = g` y `factor = 1000` incrementa el stock en 10.000 g.
2. Con stock 0, comprar 1.000 g a $5/g deja el costo medio en $5,00.
3. Con stock 1.000 g a costo $5, comprar 1.000 g a $7 deja el costo medio en exactamente $6,00.
4. Con stock 1.000 g a costo $5, comprar 3.000 g a $9 deja el costo medio en $8,00.
5. Con stock negativo (−500 g), una compra de 1.000 g a $4 deja el costo medio en $4,00, no en un valor promediado contra el negativo.
6. Borrar una compra intermedia y recalcular el ledger devuelve exactamente los mismos valores que si esa compra nunca hubiera existido.
7. Un ajuste de inventario cambia el stock y **no** cambia el costo medio.

### Recetas y consumo
8. Vender 10 unidades de un producto cuya receta lleva 150 g de un insumo con merma 5% descuenta 1.575 g.
9. El costo teórico de un plato coincide con la suma de sus líneas de receta valorizadas con merma.
10. Si un insumo sube de costo, el costo teórico de todos los platos que lo usan se actualiza, y el food cost recalculado se refleja en la ficha del producto.

### Ventas y categorías
10b. Guardar un cierre de día con algunos productos en blanco persiste ceros explícitos para esos productos y deja el día marcado como registrado.
10c. Un día marcado como cierre no entra en la serie del pronóstico y no cuenta como brecha de cobertura.
10d. Un día operativo sin ningún registro de venta se excluye de la serie y sí cuenta como brecha de cobertura.
10e. Un producto de reventa con receta de una línea (cantidad 1, merma 0) descuenta exactamente 1 unidad del insumo espejo por unidad vendida, y su margen es `precio_neto − costo_medio_del_insumo`.
10f. Todos los indicadores de venta, costo y margen del panel cuadran: comida + bebida = total.
10g. Crear un producto con `es_reventa = true` desde la UI genera o enlaza el insumo espejo y la receta de una línea en un solo flujo.

### Pronóstico
11. Con una serie perfectamente periódica (mismo valor cada lunes durante 8 semanas), el pronóstico del próximo lunes reproduce ese valor con error < 5%.
12. Con una serie constante en todos los días, todos los índices de estacionalidad quedan en 1,00 y el pronóstico es igual a la constante.
13. Con menos de 21 días de datos, el nivel de confianza reportado es `baja`.
14. Un override manual para una fecha tiene precedencia sobre el modelo y aparece marcado en el gráfico.
15. El promedio de los 7 índices de estacionalidad es siempre 1,00 (invariante de normalización).

### MRP
16. Un insumo con stock 0, sin compras pendientes y con requerimiento positivo aparece siempre en la sugerencia de compra.
17. Un insumo con una compra pendiente que llega antes de la fecha de quiebre no genera sugerencia.
18. La fecha sugerida de pedido es exactamente la fecha de quiebre menos el lead time.
19. La cantidad sugerida nunca es menor al lote mínimo de compra ni fraccionaria en unidades de compra.
20. Generar la orden de compra desde la sugerencia crea una orden en `borrador` con las líneas correctas, en unidad de compra.

### Zona horaria
21. Registrar una venta el 31 de enero a las 23:00 hora de Santiago la guarda con fecha `2026-01-31`, no `2026-02-01`. Test explícito con `TZ=America/Santiago`.

---

## 10. Plan de entrega por fases

### Fase 1 — Núcleo (construir primero, entregable por sí solo)
Maestros de insumos, proveedores y productos. Recetas con costeo. Compras con recepción. Ledger de inventario con costo medio móvil. Registro manual de ventas con backflush. Panel básico. Autenticación y roles.

Incluye el cierre de día completo (sección 7.6) con las dos categorías, el marcado de días sin operación y los productos de reventa. La carga de ventas no es una funcionalidad de fase 2: sin ella no hay datos que acumular, y el pronóstico de la fase 2 necesita al menos 3 o 4 semanas de historial real para servir de algo. **Ponerla en producción cuanto antes es lo que determina cuándo el resto del sistema empieza a tener valor.**

*Criterio de cierre:* se puede cargar el menú real, registrar una semana de compras y ventas, y el sistema muestra stock, costo por plato y margen correctos, con desglose comida / bebida. Criterios de aceptación 1 a 10g y 21 en verde.

### Fase 2 — Planificación
Pronóstico con backtesting. MRP y sugerencia de compra con generación de orden. Carga de cocina. Importación CSV de ventas. Ajustes de inventario y conteo físico.

*Criterio de cierre:* criterios 11 a 20 en verde y el WAPE visible por producto.

### Fase 3 — Reportería y refinamiento
Menu engineering. Reporte de consumo teórico vs real. Utilidad proyectada y punto de equilibrio. Exportaciones. Respaldo y restauración.

### Fase 4 — Extensiones (evaluar después de usar el sistema en producción)
- Versionado de recetas con vigencia, para que el recálculo histórico sea exacto
- BOM multinivel (sub-recetas: salsas, bases, marinados)
- Trazabilidad por lote y vencimiento con lógica FEFO
- Multi-bodega (bodega seca, refrigerada, congelados)
- Integración con POS
- Capacidad por estación de cocina con nivelación de carga

---

## 11. Riesgos conocidos

| Riesgo | Impacto | Mitigación en el diseño |
|---|---|---|
| Las recetas no se mantienen actualizadas y el consumo teórico se aleja del real | El stock del sistema deja de ser confiable en semanas | Reporte de consumo teórico vs ajustes (sección 8) que expone la brecha. Conteo físico periódico obligatorio en el flujo |
| El pronóstico se usa como verdad sin mirar el error | Compras mal dimensionadas | WAPE y nivel de confianza siempre visibles junto al número. Cantidades sugeridas siempre editables |
| Feriados, eventos y estacionalidad anual no están modelados | Pronósticos malos en fechas atípicas | Overrides manuales. Documentar la limitación en la UI del módulo de planificación |
| Carga inicial de datos maestros: es un trabajo pesado y aburrido | El proyecto no despega | Importación CSV para insumos y recetas desde el día uno. Priorizar los 20 insumos y 10 platos de mayor rotación antes que la carga completa |
| Ventas registradas tarde o incompletas | Todo el sistema pierde valor: sin ventas no hay consumo, ni pronóstico, ni margen, ni MRP | Meta dura de 2 minutos por día, solo con teclado. Calendario con los días faltantes en rojo. Indicador de cobertura de registro visible en el panel. Es el requisito de UX más importante del proyecto |
| Las bebidas quedan fuera del control de inventario por ser engorroso modelarlas | Se pierde visibilidad justo en la categoría de mayor margen | Creación asistida del producto de reventa con su insumo espejo en un solo paso (6.4.1) |

---

## 12. Glosario

| Término | Significado en este sistema |
|---|---|
| **Insumo** | Materia prima que se compra y se consume. Nunca se vende directamente |
| **Producto** | Plato o bebida que se vende. Se compone de insumos vía receta |
| **BOM / Receta** | Lista de insumos y cantidades necesarias para producir una unidad de producto |
| **Unidad base** | Unidad interna de medida de un insumo (g, ml, un). Toda cantidad se guarda así |
| **Factor de conversión** | Cuántas unidades base trae una unidad de compra |
| **Merma** | Porcentaje de pérdida del insumo por limpieza, corte o preparación |
| **Costo medio móvil** | Método de valorización: promedio ponderado que se recalcula en cada entrada |
| **Backflush** | Descuento automático de insumos del stock al registrar una venta, según receta |
| **Lead time** | Días entre emitir la orden de compra y recibir la mercadería |
| **Stock de seguridad** | Colchón mínimo que se busca no perforar |
| **Cobertura** | Días de operación que alcanza el stock actual al ritmo de consumo pronosticado |
| **Quiebre** | Momento proyectado en que el stock cae bajo el stock de seguridad |
| **MRP** | Cálculo que compara requerimientos pronosticados contra disponibilidad y propone compras |
| **COGS** | Costo de la materia prima efectivamente consumida en las ventas de un período |
| **Food cost** | COGS como porcentaje del ingreso neto |
| **WAPE** | Error porcentual absoluto ponderado. Métrica de calidad del pronóstico |
| **Reventa directa** | Producto que se vende igual a como se compró, sin transformación. Se modela con receta de una línea |
| **Insumo espejo** | El insumo de bodega que corresponde uno a uno con un producto de reventa |
| **Cobertura de registro** | Porcentaje de días operativos del período que tienen las ventas efectivamente cargadas |
| **Mix** | Participación de cada categoría (comida / bebida) en el ingreso del período |
