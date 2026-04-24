"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : T))
  | { error: string };

const senioridadeEnum = z.enum([
  "estagio",
  "junior",
  "pleno",
  "senior",
  "especialista",
  "lideranca",
]);

const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine(
    (v) =>
      v === null ||
      (() => {
        try {
          // Aceita URLs absolutas http/https
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      })(),
    { message: "URL inválida" },
  );

const talentoSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(200),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .nullable()
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  telefone: z.string().trim().max(40).nullable().optional(),
  linkedinUrl: urlOrEmpty.optional(),
  cidade: z.string().trim().max(100).nullable().optional(),
  estado: z.string().trim().max(2).nullable().optional(),
  senioridade: senioridadeEnum.nullable().optional(),
  area: z.string().trim().max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  linkCV: urlOrEmpty.optional(),
  cvArquivoUrl: urlOrEmpty.optional(),
  cvNomeArquivo: z.string().trim().max(200).nullable().optional(),
  notas: z.string().max(5000).nullable().optional(),
});

export type TalentoInput = z.input<typeof talentoSchema>;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}

function genericError(err: unknown, fallback: string): string {
  console.error("[talentos action]", err);
  return fallback;
}

export async function criarTalento(
  data: TalentoInput,
  opts: { fonteOrigem?: "manual" | "site" } = {},
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const parsed = talentoSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const t = await prisma.talento.create({
      data: {
        nome: parsed.data.nome,
        email: parsed.data.email ?? null,
        telefone: parsed.data.telefone ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
        cidade: parsed.data.cidade ?? null,
        estado: parsed.data.estado?.toUpperCase() ?? null,
        senioridade: parsed.data.senioridade ?? null,
        area: parsed.data.area ?? null,
        tags: parsed.data.tags,
        linkCV: parsed.data.linkCV ?? null,
        cvArquivoUrl: parsed.data.cvArquivoUrl ?? null,
        cvNomeArquivo: parsed.data.cvNomeArquivo ?? null,
        notas: parsed.data.notas ?? null,
        fonteOrigem: opts.fonteOrigem ?? "manual",
      },
      select: { id: true },
    });
    revalidatePath("/talentos");
    return { ok: true, id: t.id };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe um talento com este email" };
    }
    return { error: genericError(err, "Erro ao criar talento") };
  }
}

export async function atualizarTalento(
  id: string,
  data: TalentoInput,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const parsed = talentoSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.talento.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        email: parsed.data.email ?? null,
        telefone: parsed.data.telefone ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
        cidade: parsed.data.cidade ?? null,
        estado: parsed.data.estado?.toUpperCase() ?? null,
        senioridade: parsed.data.senioridade ?? null,
        area: parsed.data.area ?? null,
        tags: parsed.data.tags,
        linkCV: parsed.data.linkCV ?? null,
        cvArquivoUrl: parsed.data.cvArquivoUrl ?? null,
        cvNomeArquivo: parsed.data.cvNomeArquivo ?? null,
        notas: parsed.data.notas ?? null,
      },
    });
    revalidatePath("/talentos");
    revalidatePath(`/talentos/${id}`);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe outro talento com este email" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Talento não encontrado" };
    }
    return { error: genericError(err, "Erro ao atualizar talento") };
  }
}

export async function arquivarTalento(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  try {
    await prisma.talento.update({ where: { id }, data: { ativo: false } });
    revalidatePath("/talentos");
    return { ok: true };
  } catch (err) {
    return { error: genericError(err, "Erro ao arquivar talento") };
  }
}

export async function reativarTalento(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  try {
    await prisma.talento.update({ where: { id }, data: { ativo: true } });
    revalidatePath("/talentos");
    return { ok: true };
  } catch (err) {
    return { error: genericError(err, "Erro ao reativar talento") };
  }
}

/**
 * Adiciona um Talento como Candidato de uma vaga. Evita duplicação:
 * se já existe candidato com este talentoId na vaga, retorna o existente.
 */
export async function vincularTalentoAVaga(
  talentoId: string,
  vagaId: string,
): Promise<ActionResult<{ candidatoId: string; jaExistia: boolean }>> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const talento = await prisma.talento.findUnique({
    where: { id: talentoId },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      linkedinUrl: true,
      linkCV: true,
      cvArquivoUrl: true,
      cvNomeArquivo: true,
      notas: true,
      ativo: true,
    },
  });
  if (!talento || !talento.ativo) {
    return { error: "Talento não encontrado ou arquivado" };
  }

  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    select: { id: true, recrutadorId: true },
  });
  if (!vaga) return { error: "Vaga não encontrada" };
  if (
    session.user.role !== "admin" &&
    vaga.recrutadorId !== session.user.id
  ) {
    return { error: "Sem permissão nesta vaga" };
  }

  // Já existe candidato desse talento nesta vaga?
  const existente = await prisma.candidato.findFirst({
    where: { vagaId, talentoId },
    select: { id: true },
  });
  if (existente) {
    return { ok: true, candidatoId: existente.id, jaExistia: true };
  }

  const criado = await prisma.candidato.create({
    data: {
      vagaId,
      talentoId: talento.id,
      nome: talento.nome,
      email: talento.email,
      telefone: talento.telefone,
      linkedinUrl: talento.linkedinUrl,
      linkCV: talento.linkCV,
      cvArquivoUrl: talento.cvArquivoUrl,
      cvNomeArquivo: talento.cvNomeArquivo,
      notas: talento.notas,
      fonteOrigem: "talento",
      status: "triagem",
    },
    select: { id: true },
  });

  await prisma.atividade.create({
    data: {
      vagaId,
      autorId: session.user.id,
      tipo: "talento_vinculado",
      descricao: `adicionou ${talento.nome} à vaga (vindo do banco de talentos)`,
      metadata: { talentoId: talento.id, candidatoId: criado.id },
    },
  });

  revalidatePath(`/vagas/${vagaId}`);
  return { ok: true, candidatoId: criado.id, jaExistia: false };
}
