// Seed del menú real de Normchi: insumos, productos y recetas (BOM).
//
// Uso:
//   npm run seed:menu
//
// Es seguro correrlo más de una vez (usa upsert por código) — así que al
// subir el proyecto a un host nuevo, después de `npm install` + `npx prisma
// migrate deploy` + `npm run seed` (usuario admin), corriendo este script
// se recrea el mismo catálogo de insumos/productos/recetas.
//
// No toca los insumos/productos que el usuario haya creado a mano por fuera
// de esta lista (ej. el "Coca-cola" original con código "Coca").
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface InsumoSeed {
  codigo: string;
  nombre: string;
  categoria: string;
  unidadBase: "g" | "ml" | "un";
  unidadCompra: string;
  factorConversion: number;
  mermaPct?: number;
  stockSeguridad: number;
  loteMinimoCompra?: number;
  leadTimeDias: number;
  stockInicial: number;
  costoInicial: number;
}

const INSUMOS: InsumoSeed[] = [
  // Base (masa de pizza, comunes a varias recetas)
  { codigo: "HARINA-001", nombre: "Harina", categoria: "Abarrotes", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.02, stockSeguridad: 1000, leadTimeDias: 2, stockInicial: 5000, costoInicial: 0.8 },
  { codigo: "HUEVO-001", nombre: "Huevo", categoria: "Lácteos y huevos", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0, stockSeguridad: 6, leadTimeDias: 2, stockInicial: 24, costoInicial: 150 },
  { codigo: "SAL-001", nombre: "Sal", categoria: "Abarrotes", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0, stockSeguridad: 200, leadTimeDias: 3, stockInicial: 1000, costoInicial: 0.5 },
  { codigo: "QUESO-001", nombre: "Queso mozzarella", categoria: "Lácteos y huevos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.03, stockSeguridad: 500, leadTimeDias: 2, stockInicial: 3000, costoInicial: 6 },
  { codigo: "TOMATE-001", nombre: "Tomate", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.05, stockSeguridad: 500, leadTimeDias: 2, stockInicial: 2000, costoInicial: 1.2 },
  // Masa y secos
  { codigo: "LEVADURA-001", nombre: "Levadura", categoria: "Abarrotes", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.02, stockSeguridad: 200, leadTimeDias: 3, stockInicial: 1000, costoInicial: 3 },
  { codigo: "ACEITE-OLIVA-001", nombre: "Aceite de oliva", categoria: "Aceites", unidadBase: "ml", unidadCompra: "L", factorConversion: 1000, mermaPct: 0, stockSeguridad: 1000, leadTimeDias: 3, stockInicial: 5000, costoInicial: 6 },
  { codigo: "ACEITE-FREIR-001", nombre: "Aceite para freír", categoria: "Aceites", unidadBase: "ml", unidadCompra: "L", factorConversion: 1000, mermaPct: 0, stockSeguridad: 2000, leadTimeDias: 3, stockInicial: 10000, costoInicial: 2 },
  // Toppings de pizza
  { codigo: "CHOCLO-001", nombre: "Choclo (granos)", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.05, stockSeguridad: 500, leadTimeDias: 2, stockInicial: 2000, costoInicial: 1.5 },
  { codigo: "PEPPERONI-001", nombre: "Pepperoni", categoria: "Carnes y embutidos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.03, stockSeguridad: 500, leadTimeDias: 3, stockInicial: 2000, costoInicial: 9 },
  { codigo: "POLLO-001", nombre: "Pechuga de pollo", categoria: "Carnes y embutidos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.08, stockSeguridad: 1000, leadTimeDias: 2, stockInicial: 3000, costoInicial: 4 },
  { codigo: "CATUPIRY-001", nombre: "Salsa catupiry", categoria: "Condimentos y salsas", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.02, stockSeguridad: 500, leadTimeDias: 5, stockInicial: 2000, costoInicial: 5 },
  { codigo: "OREGANO-001", nombre: "Orégano", categoria: "Condimentos y salsas", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0, stockSeguridad: 100, leadTimeDias: 5, stockInicial: 500, costoInicial: 8 },
  { codigo: "AJO-001", nombre: "Ajo", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.1, stockSeguridad: 200, leadTimeDias: 2, stockInicial: 500, costoInicial: 3 },
  { codigo: "SALSA-TOMATE-001", nombre: "Salsa de tomate (pizza)", categoria: "Condimentos y salsas", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.02, stockSeguridad: 500, leadTimeDias: 3, stockInicial: 3000, costoInicial: 1.5 },
  // Carnes y fiambres
  { codigo: "CARNE-MOLIDA-001", nombre: "Carne molida", categoria: "Carnes y embutidos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.06, stockSeguridad: 1000, leadTimeDias: 2, stockInicial: 3000, costoInicial: 5 },
  { codigo: "JAMON-001", nombre: "Jamón", categoria: "Carnes y embutidos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.03, stockSeguridad: 500, leadTimeDias: 3, stockInicial: 1500, costoInicial: 5.5 },
  { codigo: "CARNE-LOMO-001", nombre: "Carne de lomo (fino, fetas)", categoria: "Carnes y embutidos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.05, stockSeguridad: 1000, leadTimeDias: 2, stockInicial: 3000, costoInicial: 7 },
  { codigo: "SALCHICHA-001", nombre: "Salchicha (vienesa hot dog)", categoria: "Carnes y embutidos", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0, stockSeguridad: 20, leadTimeDias: 3, stockInicial: 60, costoInicial: 350 },
  { codigo: "PATTY-HAMB-001", nombre: "Carne para hamburguesa (patty)", categoria: "Carnes y embutidos", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0, stockSeguridad: 15, leadTimeDias: 3, stockInicial: 40, costoInicial: 900 },
  // Panes y tapas
  { codigo: "TAPA-EMPANADA-001", nombre: "Tapa de empanada", categoria: "Panadería y masas", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0.02, stockSeguridad: 30, leadTimeDias: 2, stockInicial: 100, costoInicial: 120 },
  { codigo: "PAN-ARABE-001", nombre: "Pan árabe", categoria: "Panes", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0.02, stockSeguridad: 15, leadTimeDias: 2, stockInicial: 40, costoInicial: 300 },
  { codigo: "PAN-LOMITO-001", nombre: "Pan de lomito", categoria: "Panes", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0.02, stockSeguridad: 15, leadTimeDias: 2, stockInicial: 40, costoInicial: 250 },
  { codigo: "PAN-HAMB-001", nombre: "Pan de hamburguesa", categoria: "Panes", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0.02, stockSeguridad: 15, leadTimeDias: 2, stockInicial: 40, costoInicial: 200 },
  { codigo: "PAN-HOTDOG-001", nombre: "Pan de hot dog", categoria: "Panes", unidadBase: "un", unidadCompra: "un", factorConversion: 1, mermaPct: 0.02, stockSeguridad: 20, leadTimeDias: 2, stockInicial: 50, costoInicial: 150 },
  // Verduras y aderezos
  { codigo: "CEBOLLA-001", nombre: "Cebolla", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.08, stockSeguridad: 500, leadTimeDias: 2, stockInicial: 2000, costoInicial: 0.8 },
  { codigo: "LECHUGA-001", nombre: "Lechuga", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.1, stockSeguridad: 300, leadTimeDias: 2, stockInicial: 1000, costoInicial: 1 },
  { codigo: "MAYONESA-001", nombre: "Mayonesa", categoria: "Condimentos y salsas", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.01, stockSeguridad: 500, leadTimeDias: 3, stockInicial: 2000, costoInicial: 2 },
  // Papas y quesos
  { codigo: "PAPAS-001", nombre: "Papas", categoria: "Verduras", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.05, stockSeguridad: 2000, leadTimeDias: 2, stockInicial: 8000, costoInicial: 0.9 },
  { codigo: "QUESO-CHEDDAR-001", nombre: "Queso cheddar", categoria: "Lácteos y huevos", unidadBase: "g", unidadCompra: "kg", factorConversion: 1000, mermaPct: 0.02, stockSeguridad: 500, leadTimeDias: 3, stockInicial: 2000, costoInicial: 7 },
];

interface RecetaLineaSeed {
  insumoCodigo: string;
  cantidad: number;
  nota?: string;
}

interface ReventaSeed {
  unidadCompra: string;
  factorConversion: number;
  costoInicial: number;
  stockInicial?: number;
}

interface ProductoSeed {
  codigo: string;
  nombre: string;
  categoria: "comida" | "bebida";
  subcategoria?: string;
  precioVenta: number;
  tiempoPreparacionMin: number;
  estacion?: string;
  receta?: RecetaLineaSeed[];
  reventa?: ReventaSeed;
}

const PRODUCTOS: ProductoSeed[] = [
  // --- Pizzas (la "mozzarella" ya existe como "Pizza Queso") ---------------
  {
    codigo: "PIZZA-CHOCLO",
    nombre: "Pizza Choclo",
    categoria: "comida",
    subcategoria: "Pizzas",
    precioVenta: 29000,
    tiempoPreparacionMin: 15,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "HARINA-001", cantidad: 300 },
      { insumoCodigo: "LEVADURA-001", cantidad: 5 },
      { insumoCodigo: "SAL-001", cantidad: 8 },
      { insumoCodigo: "ACEITE-OLIVA-001", cantidad: 15 },
      { insumoCodigo: "SALSA-TOMATE-001", cantidad: 100 },
      { insumoCodigo: "QUESO-001", cantidad: 300 },
      { insumoCodigo: "CHOCLO-001", cantidad: 150 },
      { insumoCodigo: "OREGANO-001", cantidad: 2 },
    ],
  },
  {
    codigo: "PIZZA-PEPERONI",
    nombre: "Pizza Peperoni",
    categoria: "comida",
    subcategoria: "Pizzas",
    precioVenta: 30000,
    tiempoPreparacionMin: 15,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "HARINA-001", cantidad: 300 },
      { insumoCodigo: "LEVADURA-001", cantidad: 5 },
      { insumoCodigo: "SAL-001", cantidad: 8 },
      { insumoCodigo: "ACEITE-OLIVA-001", cantidad: 15 },
      { insumoCodigo: "SALSA-TOMATE-001", cantidad: 100 },
      { insumoCodigo: "QUESO-001", cantidad: 300 },
      { insumoCodigo: "PEPPERONI-001", cantidad: 150 },
      { insumoCodigo: "OREGANO-001", cantidad: 2 },
    ],
  },
  {
    codigo: "PIZZA-POLLO-CATUPIRY",
    nombre: "Pizza Pollo Catupiry",
    categoria: "comida",
    subcategoria: "Pizzas",
    precioVenta: 32000,
    tiempoPreparacionMin: 16,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "HARINA-001", cantidad: 300 },
      { insumoCodigo: "LEVADURA-001", cantidad: 5 },
      { insumoCodigo: "SAL-001", cantidad: 8 },
      { insumoCodigo: "ACEITE-OLIVA-001", cantidad: 15 },
      { insumoCodigo: "POLLO-001", cantidad: 150 },
      { insumoCodigo: "CATUPIRY-001", cantidad: 150 },
      { insumoCodigo: "QUESO-001", cantidad: 150 },
      { insumoCodigo: "OREGANO-001", cantidad: 2 },
    ],
  },
  {
    codigo: "PIZZA-NAPOLITANA",
    nombre: "Pizza Napolitana",
    categoria: "comida",
    subcategoria: "Pizzas",
    precioVenta: 28000,
    tiempoPreparacionMin: 15,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "HARINA-001", cantidad: 300 },
      { insumoCodigo: "LEVADURA-001", cantidad: 5 },
      { insumoCodigo: "SAL-001", cantidad: 8 },
      { insumoCodigo: "ACEITE-OLIVA-001", cantidad: 15 },
      { insumoCodigo: "SALSA-TOMATE-001", cantidad: 150 },
      { insumoCodigo: "TOMATE-001", cantidad: 100 },
      { insumoCodigo: "AJO-001", cantidad: 5 },
      { insumoCodigo: "QUESO-001", cantidad: 250 },
      { insumoCodigo: "OREGANO-001", cantidad: 3 },
    ],
  },
  // --- Empanadas -------------------------------------------------------------
  {
    codigo: "EMP-CARNE",
    nombre: "Empanada de Carne",
    categoria: "comida",
    subcategoria: "Empanadas",
    precioVenta: 2000,
    tiempoPreparacionMin: 8,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "TAPA-EMPANADA-001", cantidad: 1 },
      { insumoCodigo: "CARNE-MOLIDA-001", cantidad: 80 },
      { insumoCodigo: "CEBOLLA-001", cantidad: 20 },
      { insumoCodigo: "HUEVO-001", cantidad: 0.5, nota: "Medio huevo duro picado" },
      { insumoCodigo: "SAL-001", cantidad: 2 },
    ],
  },
  {
    codigo: "EMP-POLLO",
    nombre: "Empanada de Pollo",
    categoria: "comida",
    subcategoria: "Empanadas",
    precioVenta: 2000,
    tiempoPreparacionMin: 8,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "TAPA-EMPANADA-001", cantidad: 1 },
      { insumoCodigo: "POLLO-001", cantidad: 80 },
      { insumoCodigo: "CEBOLLA-001", cantidad: 20 },
      { insumoCodigo: "SAL-001", cantidad: 2 },
    ],
  },
  {
    codigo: "EMP-JYQ",
    nombre: "Empanada de Jamón y Queso",
    categoria: "comida",
    subcategoria: "Empanadas",
    precioVenta: 2200,
    tiempoPreparacionMin: 8,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "TAPA-EMPANADA-001", cantidad: 1 },
      { insumoCodigo: "JAMON-001", cantidad: 50 },
      { insumoCodigo: "QUESO-001", cantidad: 50 },
    ],
  },
  // --- Sándwiches y hamburguesas -----------------------------------------------
  {
    codigo: "LOMITO-ARABE",
    nombre: "Lomito Árabe",
    categoria: "comida",
    subcategoria: "Sándwiches",
    precioVenta: 7500,
    tiempoPreparacionMin: 10,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "PAN-ARABE-001", cantidad: 1 },
      { insumoCodigo: "CARNE-LOMO-001", cantidad: 150 },
      { insumoCodigo: "TOMATE-001", cantidad: 30 },
      { insumoCodigo: "CEBOLLA-001", cantidad: 20 },
      { insumoCodigo: "LECHUGA-001", cantidad: 20 },
      { insumoCodigo: "MAYONESA-001", cantidad: 15 },
    ],
  },
  {
    codigo: "LOMITO-SANDWICH",
    nombre: "Lomito Sándwich",
    categoria: "comida",
    subcategoria: "Sándwiches",
    precioVenta: 8000,
    tiempoPreparacionMin: 10,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "PAN-LOMITO-001", cantidad: 1 },
      { insumoCodigo: "CARNE-LOMO-001", cantidad: 150 },
      { insumoCodigo: "QUESO-001", cantidad: 30 },
      { insumoCodigo: "TOMATE-001", cantidad: 30 },
      { insumoCodigo: "LECHUGA-001", cantidad: 20 },
      { insumoCodigo: "MAYONESA-001", cantidad: 15 },
    ],
  },
  {
    codigo: "HAMB-CASERA",
    nombre: "Hamburguesa Casera",
    categoria: "comida",
    subcategoria: "Hamburguesas",
    precioVenta: 7000,
    tiempoPreparacionMin: 10,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "PAN-HAMB-001", cantidad: 1 },
      { insumoCodigo: "PATTY-HAMB-001", cantidad: 1 },
      { insumoCodigo: "QUESO-CHEDDAR-001", cantidad: 30 },
      { insumoCodigo: "LECHUGA-001", cantidad: 15 },
      { insumoCodigo: "TOMATE-001", cantidad: 30 },
      { insumoCodigo: "CEBOLLA-001", cantidad: 15 },
      { insumoCodigo: "MAYONESA-001", cantidad: 15 },
    ],
  },
  {
    codigo: "SUPER-PANCHO",
    nombre: "Super Pancho",
    categoria: "comida",
    subcategoria: "Hot dogs",
    precioVenta: 4500,
    tiempoPreparacionMin: 6,
    estacion: "Cocina caliente",
    receta: [
      { insumoCodigo: "PAN-HOTDOG-001", cantidad: 1 },
      { insumoCodigo: "SALCHICHA-001", cantidad: 1 },
      { insumoCodigo: "MAYONESA-001", cantidad: 10 },
      { insumoCodigo: "CEBOLLA-001", cantidad: 15 },
    ],
  },
  // --- Acompañantes ---------------------------------------------------------
  {
    codigo: "PAPAS-FRITAS",
    nombre: "Papas Fritas",
    categoria: "comida",
    subcategoria: "Acompañantes",
    precioVenta: 3500,
    tiempoPreparacionMin: 8,
    estacion: "Freidora",
    receta: [
      { insumoCodigo: "PAPAS-001", cantidad: 250 },
      { insumoCodigo: "ACEITE-FREIR-001", cantidad: 30 },
      { insumoCodigo: "SAL-001", cantidad: 3 },
    ],
  },
  {
    codigo: "PAPAS-CHEDDAR",
    nombre: "Papas Fritas con Cheddar",
    categoria: "comida",
    subcategoria: "Acompañantes",
    precioVenta: 4500,
    tiempoPreparacionMin: 8,
    estacion: "Freidora",
    receta: [
      { insumoCodigo: "PAPAS-001", cantidad: 250 },
      { insumoCodigo: "ACEITE-FREIR-001", cantidad: 30 },
      { insumoCodigo: "SAL-001", cantidad: 3 },
      { insumoCodigo: "QUESO-CHEDDAR-001", cantidad: 60 },
    ],
  },
  // --- Bebidas: reventa directa (§6.4.1 — insumo espejo automático) -----------
  {
    codigo: "COCA-250",
    nombre: "Coca-Cola 250ml",
    categoria: "bebida",
    subcategoria: "Gaseosas",
    precioVenta: 1500,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 600, stockInicial: 48 },
  },
  {
    codigo: "COCA-500",
    nombre: "Coca-Cola 500ml",
    categoria: "bebida",
    subcategoria: "Gaseosas",
    precioVenta: 2000,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 900, stockInicial: 36 },
  },
  {
    codigo: "COCA-15-RET",
    nombre: "Coca-Cola 1.5L Retornable",
    categoria: "bebida",
    subcategoria: "Gaseosas",
    precioVenta: 3000,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 1400, stockInicial: 24 },
  },
  {
    codigo: "COCA-15-NORET",
    nombre: "Coca-Cola 1.5L No Retornable",
    categoria: "bebida",
    subcategoria: "Gaseosas",
    precioVenta: 3500,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 1800, stockInicial: 24 },
  },
  {
    codigo: "CERV-MUNICH-269",
    nombre: "Cerveza Munich Ultra 269ml",
    categoria: "bebida",
    subcategoria: "Cervezas",
    precioVenta: 2500,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 1100, stockInicial: 36 },
  },
  {
    codigo: "CERV-SKOL-269",
    nombre: "Cerveza Skol 269ml",
    categoria: "bebida",
    subcategoria: "Cervezas",
    precioVenta: 2200,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 1000, stockInicial: 36 },
  },
  {
    codigo: "CERV-BUD-310",
    nombre: "Cerveza Budweiser 310ml",
    categoria: "bebida",
    subcategoria: "Cervezas",
    precioVenta: 2800,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 1300, stockInicial: 36 },
  },
  {
    codigo: "CERV-SKOL-940",
    nombre: "Cerveza Skol 940ml",
    categoria: "bebida",
    subcategoria: "Cervezas",
    precioVenta: 4500,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 2200, stockInicial: 24 },
  },
  {
    codigo: "CERV-BUD-710",
    nombre: "Cerveza Budweiser 710ml",
    categoria: "bebida",
    subcategoria: "Cervezas",
    precioVenta: 4200,
    tiempoPreparacionMin: 1,
    reventa: { unidadCompra: "un", factorConversion: 1, costoInicial: 2000, stockInicial: 24 },
  },
];

async function main() {
  const insumoIdPorCodigo = new Map<string, number>();

  for (const i of INSUMOS) {
    const data = {
      nombre: i.nombre,
      categoria: i.categoria,
      unidadBase: i.unidadBase,
      unidadCompra: i.unidadCompra,
      factorConversion: i.factorConversion,
      mermaPct: i.mermaPct ?? 0,
      stockSeguridad: i.stockSeguridad,
      loteMinimoCompra: i.loteMinimoCompra ?? 1,
      leadTimeDias: i.leadTimeDias,
      stockInicial: i.stockInicial,
      costoInicial: i.costoInicial,
    };
    const insumo = await prisma.insumo.upsert({
      where: { codigo: i.codigo },
      update: data,
      create: { codigo: i.codigo, ...data },
    });
    insumoIdPorCodigo.set(i.codigo, insumo.id);
  }
  console.log(`Insumos listos: ${INSUMOS.length}`);

  let productosCreados = 0;
  let lineasCreadas = 0;

  for (const p of PRODUCTOS) {
    if (p.reventa) {
      const { unidadCompra, factorConversion, costoInicial, stockInicial } = p.reventa;
      await prisma.$transaction(async (tx) => {
        const insumoEspejo = await tx.insumo.upsert({
          where: { codigo: p.codigo },
          update: {
            nombre: p.nombre,
            categoria: p.categoria === "bebida" ? "Bebidas" : "Comida",
            unidadCompra,
            factorConversion,
            costoInicial,
            stockInicial: stockInicial ?? 0,
          },
          create: {
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.categoria === "bebida" ? "Bebidas" : "Comida",
            unidadBase: "un",
            unidadCompra,
            factorConversion,
            mermaPct: 0,
            stockSeguridad: 0,
            loteMinimoCompra: 1,
            leadTimeDias: 3,
            stockInicial: stockInicial ?? 0,
            costoInicial,
          },
        });

        const producto = await tx.producto.upsert({
          where: { codigo: p.codigo },
          update: {
            nombre: p.nombre,
            categoria: p.categoria,
            subcategoria: p.subcategoria ?? null,
            precioVenta: p.precioVenta,
            tiempoPreparacionMin: p.tiempoPreparacionMin,
            estacion: p.estacion ?? null,
            esReventa: true,
          },
          create: {
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.categoria,
            subcategoria: p.subcategoria ?? null,
            precioVenta: p.precioVenta,
            tiempoPreparacionMin: p.tiempoPreparacionMin,
            estacion: p.estacion ?? null,
            esReventa: true,
          },
        });

        await tx.recetaLinea.upsert({
          where: { productoId_insumoId: { productoId: producto.id, insumoId: insumoEspejo.id } },
          update: { cantidad: 1, nota: "Insumo espejo (reventa directa)" },
          create: {
            productoId: producto.id,
            insumoId: insumoEspejo.id,
            cantidad: 1,
            nota: "Insumo espejo (reventa directa)",
          },
        });
      });

      productosCreados += 1;
      lineasCreadas += 1;
      continue;
    }

    const producto = await prisma.producto.upsert({
      where: { codigo: p.codigo },
      update: {
        nombre: p.nombre,
        categoria: p.categoria,
        subcategoria: p.subcategoria ?? null,
        precioVenta: p.precioVenta,
        tiempoPreparacionMin: p.tiempoPreparacionMin,
        estacion: p.estacion ?? null,
      },
      create: {
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        subcategoria: p.subcategoria ?? null,
        precioVenta: p.precioVenta,
        tiempoPreparacionMin: p.tiempoPreparacionMin,
        estacion: p.estacion ?? null,
      },
    });
    productosCreados += 1;

    for (const linea of p.receta ?? []) {
      const insumoId = insumoIdPorCodigo.get(linea.insumoCodigo);
      if (!insumoId) {
        throw new Error(`Insumo "${linea.insumoCodigo}" no encontrado (receta de "${p.codigo}").`);
      }
      await prisma.recetaLinea.upsert({
        where: { productoId_insumoId: { productoId: producto.id, insumoId } },
        update: { cantidad: linea.cantidad, nota: linea.nota ?? null },
        create: { productoId: producto.id, insumoId, cantidad: linea.cantidad, nota: linea.nota ?? null },
      });
      lineasCreadas += 1;
    }
  }

  console.log(`Productos listos: ${productosCreados}`);
  console.log(`Líneas de receta listas: ${lineasCreadas}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
