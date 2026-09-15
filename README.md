# Normchi

Sistema de gestión de costos, inventario y planificación para un restaurante
propio. Cierra el ciclo completo del negocio:

```
Compras  →  Inventario  →  Recetas (BOM)  →  Ventas
                 ↑                              ↓
                 └──────  Planificación  ───────┘
                        (pronóstico + MRP)
```

La especificación funcional y de negocio completa (modelo de datos, fórmulas,
pantallas, fases de entrega) vive en **`normchi-especificacion.md`** — es la
fuente de verdad normativa del proyecto. Este README explica qué de esa
especificación ya está construido y cómo levantar el proyecto desde cero.

**Requisito no negociable del dueño del negocio:** 100% local y sin costo.
Nada de servicios pagos ni de nube (ni DB, ni auth, ni hosting) — pensado para
uso interno de un solo local, con posibilidad de migrar a algo más grande si
el negocio crece.

## Estado actual (qué se ha construido)

Las Fases 1 a 3 del plan de entrega (§10 de la especificación) están
**completas**:

| Módulo | Estado | Ruta |
|---|---|---|
| Insumos (materias primas, unidad base + unidad de compra + factor de conversión) | ✅ | `/insumos` |
| Proveedores | ✅ | `/configuracion/proveedores` |
| Recetas (BOM) con costeo en vivo y semáforo de food cost | ✅ | `/recetas` |
| Compras (ciclo borrador → pendiente → recibida / anulada) | ✅ | `/compras` |
| Ventas (cierre de día manual + importación CSV, backflush automático de insumos) | ✅ | `/ventas` |
| Inventario (ledger de movimientos, costo medio móvil, ajustes) | ✅ | `/inventario` |
| Planificación (pronóstico de demanda, MRP, carga de cocina) | ✅ | `/planificacion` |
| Reportería (menu engineering, gasto en compras, márgenes, utilidad proyectada) | ✅ | `/reportes` |
| Parámetros del sistema (IVA, horizonte, capacidad de cocina, etc. — editables sin tocar código) | ✅ | `/configuracion/parametros` |
| Login y gestión de usuarios (roles admin/compras/cocina/cajero/lectura) | ✅ | `/login`, `/configuracion/usuarios` |
| **API HTTP propia** — cada módulo lee/escribe a través de `/api/**`, no de Server Actions | ✅ | ver sección **API** más abajo |

Toda la lógica de negocio normativa de la especificación (§6: conversión de
unidades, costo medio móvil ponderado, ledger, backflush, costeo de recetas,
pronóstico de demanda, MRP, carga de cocina, menu engineering, utilidad
proyectada) está implementada como **funciones puras y testeadas** en
`src/lib/motor/` (42 tests, `npm test`).

### Pendiente / fuera de alcance por ahora

- **Permisos granulares por rol.** El modelo `Rol` (admin/compras/cocina/
  cajero/lectura) existe y el login ya lo guarda en la sesión, pero solo se
  aplica una regla de acceso real hoy: `/configuracion/usuarios` y
  `/configuracion/parametros` son exclusivos de `admin` (redirige a `/` si
  no lo eres). La matriz de permisos completa por módulo descrita en la
  especificación (§5.2 — p. ej. `cocina` solo debería tocar recetas y
  ajustes) **no** está enforced todavía: cualquier usuario autenticado puede
  usar el resto de los módulos sin importar su rol.
- **Configuración → Respaldo.** Mencionado en la navegación de la
  especificación (§7.1) pero no desarrollado; hoy el respaldo es manual
  (`pg_dump`).
- **Seed de datos de demostración** (§8: ~14 insumos, 4 proveedores, 8
  productos, 8 semanas de ventas sintéticas, etc.) — no construido. El
  `seed.ts` actual solo crea el usuario administrador inicial.
- Lo marcado **[FUERA DE ALCANCE]** en la especificación (§2): integración
  con POS/boleta electrónica, contabilidad/nómina, multi-local, trazabilidad
  por lote/FEFO, app móvil nativa.

## Decisiones de arquitectura importantes

- **Next.js 16** (App Router, Turbopack) — más nuevo que lo sugerido en la
  especificación original. Tiene cambios de breaking respecto a Next 15
  (`params`/`searchParams` async, `middleware` → `proxy`, etc.). Antes de
  tocar rutas, revisar `node_modules/next/dist/docs/` si algo no calza con lo
  que se espera de Next.js clásico.
- **Prisma 7** con la arquitectura sin motor Rust: no hay `url` en el bloque
  `datasource` de `schema.prisma`; la conexión se arma en `prisma.config.ts` +
  `src/lib/prisma.ts` vía `@prisma/adapter-pg` (driver adapter a Postgres).
- **PostgreSQL local vía Homebrew**, sin Docker, sin nube. Ver sección de
  puesta en marcha.
- **Autenticación propia** (sin proveedores externos): `bcryptjs` para el
  hash de contraseña, `jose`/JWT en una cookie httpOnly para la sesión. La
  firma/verificación del token vive en `src/lib/sesion.ts` (sin
  `next/headers`, así la puede usar tanto `src/lib/auth.ts` como
  `src/proxy.ts`, que corren en bundles distintos). El proxy protege toda la
  app: sin sesión válida, redirige a `/login`.
- **Capa "motor" (`src/lib/motor/`)**: toda la matemática de negocio —
  conversión de unidades, costo medio móvil, reconstrucción del ledger,
  backflush, costeo de recetas, pronóstico (Holt-Winters simplificado), MRP,
  carga de cocina, menu engineering (Kasavana-Smith), utilidad proyectada —
  vive aquí como funciones puras sin dependencias de DB/React, cada una con
  su test unitario.
- **Reconstrucción total del ledger**: `recalcularInventarioCompleto()`
  (`src/lib/inventario.ts`) borra y reconstruye toda la tabla
  `movimientos_inventario` desde compras/ventas/ajustes cada vez que algo
  cambia — sin actualizaciones incrementales, por requerimiento explícito de
  la especificación (§6.3).
- **Manejo de fechas — cuidado aquí**: `src/lib/fechas.ts` tiene dos
  funciones que NO son intercambiables. `toFechaLocal()` hace conversión real
  de zona horaria (para timestamps reales); `toFechaCalendario()` extrae la
  fecha UTC cruda (para columnas de fecha-calendario pura como
  `fecha_emision`, `ventas.fecha`, etc., que ya están ancladas a medianoche
  UTC). Usar la incorrecta desplaza la fecha en ±1 día y puede corromper
  silenciosamente agregaciones del ledger por fecha. Hay un test de regresión
  en `fechas.test.ts`.
- **Parámetros configurables** (`src/lib/parametros.ts`): IVA, horizonte de
  planificación, ventana histórica, alpha de suavizamiento, capacidad de
  cocina, costos fijos diarios y días de operación viven en la tabla
  `parametros` (clave-valor) y se editan desde `/configuracion/parametros` —
  nada de esto está hardcodeado en el código de negocio.
- **Recharts** para todos los gráficos. Ojo con el `width` del `YAxis`: si es
  muy angosto trunca los ticks numéricos (se ven como "0" repetido) — hay que
  dimensionarlo al label más largo, o usar `formatearPesosCompacto()` de
  `src/lib/formato.ts` para ejes de plata.

## API

Normchi es **API first**: toda lectura estructurada y toda escritura pasa por
una API HTTP propia bajo `/api/**` (Next.js Route Handlers) — no quedan
Server Actions en el proyecto. Esto significa que, si más adelante se necesita
otro cliente (una app móvil, un script de reportes, una integración con un
POS), ya existe una API real contra la cual construir.

**Arquitectura de tres capas**, la misma en cada módulo:

1. **`src/lib/services/<modulo>.ts`** (o directamente en `src/lib/<modulo>.ts`
   para los módulos que ya tenían una capa de datos, como `inventario.ts`,
   `parametros.ts`, `planificacion.ts`, `reportes.ts`): funciones `async` de
   servidor con la lógica real (Prisma, reglas de negocio). Lanzan `ErrorApi`,
   `ErrorCampo` o `ErrorValidacion` (`src/lib/apiAuth.ts`) sobre condiciones de
   error — nunca devuelven un shape `{ok, mensaje}` ellas mismas.
2. **`src/app/api/**/route.ts`**: valida sesión (`exigirSesion()` /
   `exigirAdmin()`), valida el body con el mismo esquema Zod de
   `src/lib/validaciones/*.ts`, llama al servicio, traduce cualquier error con
   `manejarErrorApi()` a la respuesta JSON correspondiente (`401`/`403`/`400`/
   `404`/`500`).
3. **`src/lib/api/<modulo>.ts`** (cliente, se importa desde componentes
   `"use client"`): funciones `async` con la **misma firma** que tenía la
   Server Action que reemplazan (para que el componente no cambie), que hacen
   `fetch()` contra la ruta y devuelven el mismo shape `EstadoFormulario*` /
   `Resultado*` que ya consumían los formularios.

Los **Server Components** (`page.tsx`) no llaman a la API por HTTP —
llaman directo a la función del servicio (sería un round-trip inútil dentro
del mismo proceso). La API y el render del servidor comparten exactamente la
misma función, así que nunca hay dos implementaciones de la misma lectura.

**Autenticación de la API**: la misma cookie de sesión que usa el resto de la
app (`src/lib/sesion.ts`/`auth.ts`) — no hay tokens Bearer. `src/proxy.ts`
devuelve `401` en JSON (no redirige a `/login`) si `pathname` empieza con
`/api/` y no hay sesión; cada route handler además vuelve a llamar
`exigirSesion()`/`exigirAdmin()` por su cuenta, nunca confía solo en el proxy.

**Convención**: `GET/POST /api/<recurso>`, `GET/PATCH /api/<recurso>/[id]`,
sub-rutas de acción para transiciones que no son un CRUD plano (ej.
`/api/compras/[id]/recepcion`). No hay `DELETE` — ningún módulo borra
físicamente, todo es `activo: false` o un estado (`anulada`, etc.).

| Módulo | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/sesion` |
| Insumos | `GET/POST /api/insumos`, `PATCH /api/insumos/[id]` (edición completa o `{activo}` para activar/desactivar) |
| Proveedores | `GET/POST /api/proveedores`, `PATCH /api/proveedores/[id]` |
| Recetas (productos) | `GET/POST /api/productos`, `GET/PATCH /api/productos/[id]`, `PUT /api/productos/[id]/receta`, `POST /api/productos/[id]/duplicar` |
| Compras | `GET/POST /api/compras`, `GET/PATCH /api/compras/[id]`, `POST /api/compras/[id]/enviar`, `POST /api/compras/[id]/recepcion`, `POST /api/compras/[id]/anular` |
| Inventario | `GET /api/inventario/movimientos`, `GET/POST /api/inventario/ajustes`, `POST /api/inventario/recalcular` |
| Ventas | `GET/POST /api/ventas` (cierre de día), `GET /api/ventas/historial`, `POST /api/ventas/dia-sin-operacion`, `POST /api/ventas/reabrir`, `POST /api/ventas/importar` |
| Planificación | `GET /api/planificacion?horizonte=14` (pronóstico + MRP + carga de cocina), `POST /api/planificacion/overrides`, `DELETE /api/planificacion/overrides/[id]`, `POST /api/planificacion/generar-orden` |
| Reportes | `GET /api/reportes/{menu-engineering,gasto-compras,cobertura,costo-insumos,merma,mix-evolucion}` |
| Parámetros | `GET/PATCH /api/parametros` (admin) |
| Usuarios | `GET/POST /api/usuarios`, `PATCH /api/usuarios/[id]`, `POST /api/usuarios/[id]/estado` (admin) |

**Pendiente / fuera de alcance de la API**: no hay tokens Bearer (solo cookie
de sesión, pensado para el propio navegador); no hay documentación
OpenAPI/Swagger; los permisos son binarios (admin vs. cualquier autenticado),
no la matriz granular por rol del §5.2.

## Puesta en marcha (primera vez en una máquina nueva)

### Requisitos

- Node.js 22+
- PostgreSQL local (Homebrew): `brew install postgresql@17`

### Pasos

```bash
# 1. Levantar Postgres local (queda corriendo como servicio en segundo plano)
brew services start postgresql@17
createdb normchi

# 2. Variables de entorno
cp .env.example .env
# Editar DATABASE_URL con tu usuario del sistema si es distinto de "rey",
# y generar AUTH_SECRET con:
#   openssl rand -base64 32

# 3. Dependencias y esquema
npm install
npx prisma migrate dev

# 4. Usuario administrador inicial
npm run seed

# 5. Levantar la app
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) — te pedirá iniciar
sesión. Usa `admin@normchi.local` / `cambiar123` (cámbiala luego desde
Configuración → Usuarios) y verás la guía de tres pasos (cargar insumos →
cargar recetas → registrar la primera venta) si la base está vacía.

## Scripts

- `npm run dev` — servidor de desarrollo (Turbopack)
- `npm run build` / `npm run start` — build y servidor de producción
- `npm test` / `npm run test:watch` — tests de la capa de motor (`src/lib/motor/`) y utilidades
- `npm run lint` — ESLint
- `npm run seed` — crea el usuario administrador inicial (`admin@normchi.local`, contraseña provisoria `cambiar123`)
- `npx tsc --noEmit` — chequeo de tipos
- `npx prisma studio` — explorador visual de la base de datos local
- `npx prisma migrate dev` — aplica cambios de `prisma/schema.prisma`

Antes de dar por terminado cualquier cambio de código, correr los tres:
`npx tsc --noEmit`, `npm run lint`, `npm test` — deben quedar en 0 errores.

## Stack técnico

Next.js 16 (App Router) + TypeScript estricto · Tailwind v4 + shadcn/ui
(preset Nova: Lucide + Geist) · Prisma 7 sobre PostgreSQL local (driver
adapter `@prisma/adapter-pg`, sin motor Rust) · Zod para validación · Recharts
para gráficos · `date-fns` / `date-fns-tz` para fechas · `decimal.js` para
montos · `bcryptjs` + `jose` para auth propia (login + sesión por cookie) ·
Vitest para tests.

## Estructura del proyecto

```
normchi-especificacion.md   Especificación funcional — fuente de verdad
prisma/
  schema.prisma              Modelo de datos completo
  seed.ts                    Crea el usuario admin inicial
src/proxy.ts                 Protege toda la app: sin sesión, 401 (API) o redirige a /login (páginas)
src/lib/
  motor/                     Lógica de negocio pura + tests (unidades, costo
                             medio, ledger, backflush, recetas, pronóstico,
                             MRP, cocina, menu engineering, utilidad)
  services/                  Escrituras por módulo (insumos, productos,
                             compras, usuarios, auth, proveedores) — llamadas
                             por los route handlers y por los Server Components
  api/                       Cliente HTTP por módulo, mismo import que antes
                             usaban los componentes para la Server Action
  apiAuth.ts                 exigirSesion/exigirAdmin, ErrorApi/ErrorCampo/
                             ErrorValidacion, manejarErrorApi
  parametros.ts              Lectura/escritura de la tabla `parametros`
  inventario.ts              Ledger completo: reconstrucción, lecturas y
                             escrituras (ajustes, recalculo manual)
  planificacion.ts           Series históricas + orquestación completa de
                             pronóstico/MRP/carga de cocina + overrides
  reportes.ts                Consultas agregadas para /reportes y su API
  fechas.ts                  toFechaLocal vs toFechaCalendario (ver arriba)
  sesion.ts                  Firma/verifica el JWT — sin next/headers, la usa
                             también el proxy
  auth.ts / senas.ts         Sesión (cookie) + hash de contraseña
  usuarioActual.ts           Id del usuario autenticado (para auditoría)
src/app/
  api/                       Route Handlers — ver sección API arriba
  login/                     Pantalla de login
  insumos/ recetas/ compras/ ventas/ inventario/
  planificacion/ reportes/ configuracion/    Una carpeta por módulo (Next.js
                                              App Router: page.tsx + componentes,
                                              ya sin actions.ts); configuracion/
                                              usuarios y configuracion/parametros
                                              exigen rol admin
```

## Si retomas esto sin este contexto

1. Lee `normchi-especificacion.md` completo antes de tocar nada — es
   normativo, no una sugerencia.
2. Corre `npx tsc --noEmit && npm run lint && npm test` primero para
   confirmar que partes de una base sana.
3. Lo próximo que probablemente falte, en orden de prioridad: permisos
   granulares por rol en cada módulo (§5.2 — hoy solo Usuarios/Parámetros
   están restringidos a admin), Configuración → Respaldo, el seed de datos
   de demostración de la §8, y documentación OpenAPI de `/api/**` si se llega
   a necesitar un cliente externo real.
