-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'compras', 'cocina', 'cajero', 'lectura');

-- CreateEnum
CREATE TYPE "UnidadBase" AS ENUM ('g', 'ml', 'un');

-- CreateEnum
CREATE TYPE "CategoriaProducto" AS ENUM ('comida', 'bebida');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('borrador', 'pendiente', 'recibida', 'anulada');

-- CreateEnum
CREATE TYPE "CanalVenta" AS ENUM ('salon', 'delivery', 'retiro');

-- CreateEnum
CREATE TYPE "OrigenVenta" AS ENUM ('manual', 'csv');

-- CreateEnum
CREATE TYPE "MotivoAjuste" AS ENUM ('conteo_fisico', 'merma', 'vencimiento', 'error_registro', 'otro');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada_compra', 'consumo_venta', 'ajuste', 'saldo_inicial');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "lead_time_dias" INTEGER NOT NULL DEFAULT 3,
    "condicion_pago" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad_base" "UnidadBase" NOT NULL,
    "unidad_compra" TEXT NOT NULL,
    "factor_conversion" DECIMAL(14,6) NOT NULL,
    "merma_pct" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "stock_seguridad" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lote_minimo_compra" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "lead_time_dias" INTEGER NOT NULL,
    "proveedor_id" INTEGER,
    "perecible" BOOLEAN NOT NULL DEFAULT false,
    "stock_inicial" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "costo_inicial" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_demo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaProducto" NOT NULL,
    "subcategoria" TEXT,
    "es_reventa" BOOLEAN NOT NULL DEFAULT false,
    "precio_venta" DECIMAL(14,4) NOT NULL,
    "tiempo_preparacion_min" DECIMAL(6,2) NOT NULL,
    "estacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_demo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_lineas" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(14,6) NOT NULL,
    "nota" TEXT,

    CONSTRAINT "receta_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_esperada" DATE NOT NULL,
    "fecha_recepcion" DATE,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'borrador',
    "documento" TEXT,
    "nota" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "anulado_motivo" TEXT,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_lineas" (
    "id" SERIAL NOT NULL,
    "compra_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad_compra" DECIMAL(14,4) NOT NULL,
    "precio_unitario_compra" DECIMAL(14,4) NOT NULL,
    "cantidad_recibida_compra" DECIMAL(14,4),

    CONSTRAINT "compra_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "canal" "CanalVenta" NOT NULL,
    "origen" "OrigenVenta" NOT NULL DEFAULT 'manual',
    "nota" TEXT,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_lineas" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL,
    "precio_unitario" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "venta_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_cierre" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_cierre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_inventario" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad_delta" DECIMAL(14,4) NOT NULL,
    "motivo" "MotivoAjuste" NOT NULL,
    "nota" TEXT,
    "usuario_id" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" BIGSERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "secuencia" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "origen_tabla" TEXT NOT NULL,
    "origen_id" BIGINT NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL,
    "costo_unitario" DECIMAL(14,4) NOT NULL,
    "costo_medio_resultante" DECIMAL(14,4) NOT NULL,
    "stock_resultante" DECIMAL(14,4) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_overrides" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "parametros_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "insumos_codigo_key" ON "insumos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "receta_lineas_producto_id_insumo_id_key" ON "receta_lineas"("producto_id", "insumo_id");

-- CreateIndex
CREATE UNIQUE INDEX "compras_folio_key" ON "compras"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "dias_cierre_fecha_key" ON "dias_cierre"("fecha");

-- CreateIndex
CREATE INDEX "movimientos_inventario_insumo_id_fecha_secuencia_idx" ON "movimientos_inventario"("insumo_id", "fecha", "secuencia");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_overrides_producto_id_fecha_key" ON "forecast_overrides"("producto_id", "fecha");

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_lineas" ADD CONSTRAINT "receta_lineas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_lineas" ADD CONSTRAINT "receta_lineas_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_lineas" ADD CONSTRAINT "compra_lineas_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_lineas" ADD CONSTRAINT "compra_lineas_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_lineas" ADD CONSTRAINT "venta_lineas_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_lineas" ADD CONSTRAINT "venta_lineas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_inventario" ADD CONSTRAINT "ajustes_inventario_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_inventario" ADD CONSTRAINT "ajustes_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_overrides" ADD CONSTRAINT "forecast_overrides_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
