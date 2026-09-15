import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { hashearPassword } from "../src/lib/senas";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const email = "admin@normchi.local";
  const passwordProvisoria = "cambiar123";

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nombre: "Administrador",
      passwordHash: await hashearPassword(passwordProvisoria),
      rol: "admin",
    },
  });

  console.log(`Usuario listo: ${admin.email} (contraseña provisoria: ${passwordProvisoria})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
