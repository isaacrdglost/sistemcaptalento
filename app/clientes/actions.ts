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

const cnpjOptional = z
  .string()
  .trim()
  .max(20)
  .nullable()
  .optional()
  .transform((v) => {
    if (!v) return null;
    // Mantém só dígitos para unicidade estável
    const digits = v.replace(/\D+/g, "");
    return digits.length === 0 ? null : digits;
  })
  .refine((v) => v === null || v.length === 14, {
    message: "CNPJ deve ter 14 dígitos",
  });

const clienteSchema = z.object({
  razaoSocial: z.string().trim().min(2, "Razão social obrigatória").max(200),
  nomeFantasia: z.string().trim().max(200).nullable().optional(),
  cnpj: cnpjOptional,
  contatoResponsavel: z.string().trim().max(200).nullable().optional(),
  emailPrincipal: z
    .string()
    .trim()
    .email("Email inválido")
    .nullable()
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  telefone: z.string().trim().max(40).nullable().optional(),
  segmento: z.string().trim().max(100).nullable().optional(),
  obs: z.string().max(5000).nullable().optional(),
  ativo: z.boolean().optional().default(true),
});

export type ClienteInput = z.input<typeof clienteSchema>;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

/**
 * Comercial vê Clientes em modo somente-leitura. Qualquer ação de mutação
 * deve rejeitar essa role no servidor (defesa em profundidade — UI já
 * desabilita os campos, mas devtools poderia bypassar).
 */
type GuardSession = NonNullable<Awaited<ReturnType<typeof requireUser>>>;
type GuardResult =
  | { ok: true; session: GuardSession }
  | { ok: false; error: string };

async function requireUserPodeEditar(): Promise<GuardResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (session.user.role === "comercial") {
    return { ok: false, error: "Sem permissão" };
  }
  return { ok: true, session };
}

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}

function genericError(err: unknown, fallback: string): string {
  console.error("[clientes action]", err);
  return fallback;
}

export async function criarCliente(
  data: ClienteInput,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireUserPodeEditar();
  if (!guard.ok) return { error: guard.error };

  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const novo = await prisma.cliente.create({
      data: {
        razaoSocial: parsed.data.razaoSocial,
        nomeFantasia: parsed.data.nomeFantasia ?? null,
        cnpj: parsed.data.cnpj ?? null,
        contatoResponsavel: parsed.data.contatoResponsavel ?? null,
        emailPrincipal: parsed.data.emailPrincipal ?? null,
        telefone: parsed.data.telefone ?? null,
        segmento: parsed.data.segmento ?? null,
        obs: parsed.data.obs ?? null,
        ativo: parsed.data.ativo ?? true,
      },
      select: { id: true },
    });
    revalidatePath("/clientes");
    revalidatePath("/vagas/nova");
    return { ok: true, id: novo.id };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe um cliente com este CNPJ" };
    }
    return { error: genericError(err, "Erro ao criar cliente") };
  }
}

export async function atualizarCliente(
  id: string,
  data: ClienteInput,
): Promise<ActionResult> {
  const guard = await requireUserPodeEditar();
  if (!guard.ok) return { error: guard.error };

  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        razaoSocial: parsed.data.razaoSocial,
        nomeFantasia: parsed.data.nomeFantasia ?? null,
        cnpj: parsed.data.cnpj ?? null,
        contatoResponsavel: parsed.data.contatoResponsavel ?? null,
        emailPrincipal: parsed.data.emailPrincipal ?? null,
        telefone: parsed.data.telefone ?? null,
        segmento: parsed.data.segmento ?? null,
        obs: parsed.data.obs ?? null,
        ativo: parsed.data.ativo ?? true,
      },
    });
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe outro cliente com este CNPJ" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Cliente não encontrado" };
    }
    return { error: genericError(err, "Erro ao atualizar cliente") };
  }
}

export async function arquivarCliente(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "recruiter")
  ) {
    return { error: "Sem permissão" };
  }
  try {
    await prisma.cliente.update({ where: { id }, data: { ativo: false } });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    return { error: genericError(err, "Erro ao arquivar cliente") };
  }
}

export async function reativarCliente(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "recruiter")
  ) {
    return { error: "Sem permissão" };
  }
  try {
    await prisma.cliente.update({ where: { id }, data: { ativo: true } });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    return { error: genericError(err, "Erro ao reativar cliente") };
  }
}
