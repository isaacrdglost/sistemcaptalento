import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATES_DEFAULT } from "../lib/lead-templates";

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

  // Comercial de exemplo (gated por env pra não criar acidentalmente em prod)
  let comercialEmail: string | null = null;
  if (process.env.SEED_COMERCIAL === "1") {
    const comercial = await prisma.user.upsert({
      where: { email: "comercial.captalento@gmail.com" },
      update: {},
      create: {
        nome: "Comercial Demo",
        email: "comercial.captalento@gmail.com",
        senhaHash: await bcrypt.hash("comercial123", 10),
        role: "comercial",
        ativo: true,
      },
    });
    comercialEmail = comercial.email;
  }

  // Templates iniciais de mensagem (WhatsApp + email). Idempotente:
  // só insere se ainda não houver nenhum cadastrado, pra preservar
  // edições que o admin já tenha feito.
  const totalTemplates = await prisma.mensagemTemplate.count();
  if (totalTemplates === 0) {
    for (const t of TEMPLATES_DEFAULT) {
      await prisma.mensagemTemplate.create({
        data: {
          nome: t.nome,
          canal: t.canal,
          assunto: "assunto" in t ? t.assunto : null,
          corpo: t.corpo,
          ordem: t.ordem,
          ativo: true,
        },
      });
    }
    console.log(`Seed: ${TEMPLATES_DEFAULT.length} templates criados.`);
  } else {
    console.log(
      `Seed: ${totalTemplates} templates já cadastrados — preservados.`,
    );
  }

  console.log("Seed concluído:");
  console.log(" - admin:", admin.email);
  console.log(" - recrutador:", jullya.email);
  if (comercialEmail) {
    console.log(" - comercial:", comercialEmail);
  } else {
    console.log(
      " - comercial: pulado (rode com SEED_COMERCIAL=1 pra criar)",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
