/**
 * Migração única: converte strings livres do campo Vaga.cliente em entidades
 * Cliente e popula Vaga.clienteId. Seguro de rodar várias vezes (idempotente):
 *
 *  - Vagas que já têm clienteId são ignoradas.
 *  - Clientes existentes com mesma razaoSocial são reaproveitados.
 *
 * Uso: npm run db:backfill-clientes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vagasSemCliente = await prisma.vaga.findMany({
    where: { clienteId: null },
    select: { id: true, cliente: true },
  });

  if (vagasSemCliente.length === 0) {
    console.log("Nada a fazer — todas as vagas já têm clienteId.");
    return;
  }

  console.log(`Encontradas ${vagasSemCliente.length} vagas sem clienteId.`);

  // Agrupa vagas por nome de cliente (normalizado: trim + lowercase).
  const bucket = new Map<string, { nome: string; vagaIds: string[] }>();
  for (const v of vagasSemCliente) {
    const nome = v.cliente.trim();
    if (!nome) continue;
    const key = nome.toLowerCase();
    const existing = bucket.get(key);
    if (existing) {
      existing.vagaIds.push(v.id);
    } else {
      bucket.set(key, { nome, vagaIds: [v.id] });
    }
  }

  console.log(`${bucket.size} clientes únicos a criar/reaproveitar.`);

  for (const [key, info] of bucket.entries()) {
    // Reaproveita Cliente existente (case-insensitive) se houver
    const existente = await prisma.cliente.findFirst({
      where: {
        razaoSocial: {
          equals: info.nome,
          mode: "insensitive",
        },
      },
      select: { id: true, razaoSocial: true },
    });

    const clienteId =
      existente?.id ??
      (
        await prisma.cliente.create({
          data: { razaoSocial: info.nome, ativo: true },
          select: { id: true },
        })
      ).id;

    await prisma.vaga.updateMany({
      where: { id: { in: info.vagaIds } },
      data: { clienteId },
    });

    console.log(
      `  ${existente ? "Reaproveitado" : "Criado"} Cliente "${info.nome}" (${clienteId}) → ${info.vagaIds.length} vaga(s)`,
    );
  }

  console.log("Backfill concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
