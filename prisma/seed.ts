import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "contato.captalentorh@gmail.com" },
    update: {},
    create: {
      nome: "Admin",
      email: "contato.captalentorh@gmail.com",
      senhaHash: await bcrypt.hash("admin123", 10),
      role: "admin",
      ativo: true,
    },
  });

  const jullya = await prisma.user.upsert({
    where: { email: "jullyamelo.captalento@gmail.com" },
    update: {},
    create: {
      nome: "Jullya Melo",
      email: "jullyamelo.captalento@gmail.com",
      senhaHash: await bcrypt.hash("jullya123", 10),
      role: "recruiter",
      ativo: true,
    },
  });

  console.log("Seed concluído:");
  console.log(" - admin:", admin.email);
  console.log(" - recrutador:", jullya.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
