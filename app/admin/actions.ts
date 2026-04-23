"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : T))
  | { error: string };

const roleEnum = z.enum(["recruiter", "admin"]);

const criarUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: roleEnum,
});

export type CriarUsuarioInput = z.input<typeof criarUsuarioSchema>;

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: roleEnum,
  ativo: z.boolean(),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
});

export type AtualizarUsuarioInput = z.input<typeof atualizarUsuarioSchema>;

async function guard(): Promise<
  { error: string; sessionUserId?: undefined } | { error?: undefined; sessionUserId: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Sem permissão" };
  }
  return { sessionUserId: session.user.id };
}

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}

function genericError(err: unknown, fallback: string): string {
  // Logamos o erro real no servidor e devolvemos mensagem genérica ao cliente.
  console.error("[admin action]", err);
  return fallback;
}

async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "admin", ativo: true } });
}

export async function criarUsuario(
  data: CriarUsuarioInput,
): Promise<ActionResult<{ id: string }>> {
  const g = await guard();
  if (g.error) return { error: g.error };

  const parsed = criarUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }
  const { nome, email, senha, role } = parsed.data;
  const emailNorm = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { id: true },
  });
  if (existing) {
    return { error: "Já existe um usuário com este email" };
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome: nome.trim(),
        email: emailNorm,
        senhaHash,
        role,
      },
      select: { id: true },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { ok: true, id: user.id };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe um usuário com este email" };
    }
    return { error: genericError(err, "Erro ao criar usuário") };
  }
}

export async function atualizarUsuario(
  id: string,
  data: AtualizarUsuarioInput,
): Promise<ActionResult> {
  const g = await guard();
  if (g.error) return { error: g.error };

  if (!id || typeof id !== "string") {
    return { error: "Id inválido" };
  }

  const parsed = atualizarUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }
  const { nome, email, role, ativo, senha } = parsed.data;
  const emailNorm = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, ativo: true },
  });
  if (!existing) {
    return { error: "Usuário não encontrado" };
  }

  const isSelf = id === g.sessionUserId;

  // Admin não pode rebaixar ou desativar a si mesmo — senão fica trancado fora
  if (isSelf && role !== existing.role) {
    return { error: "Você não pode alterar seu próprio papel" };
  }
  if (isSelf && !ativo) {
    return { error: "Você não pode desativar a si mesmo" };
  }

  // Proteção contra deixar o sistema sem nenhum admin ativo
  const estavaAdmin = existing.role === "admin" && existing.ativo;
  const viraNaoAdmin = role !== "admin" || !ativo;
  if (estavaAdmin && viraNaoAdmin) {
    const adminsAtivos = await countActiveAdmins();
    if (adminsAtivos <= 1) {
      return {
        error: "Não é possível — este é o último admin ativo do sistema",
      };
    }
  }

  if (emailNorm !== existing.email) {
    const other = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });
    if (other && other.id !== id) {
      return { error: "Já existe outro usuário com este email" };
    }
  }

  try {
    const updateData: Prisma.UserUpdateInput = {
      nome: nome.trim(),
      email: emailNorm,
      role,
      ativo,
    };
    if (senha && senha.length > 0) {
      updateData.senhaHash = await bcrypt.hash(senha, 10);
    }
    await prisma.user.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Já existe outro usuário com este email" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Usuário não encontrado" };
    }
    return { error: genericError(err, "Erro ao atualizar usuário") };
  }
}

export async function desativarUsuario(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g.error) return { error: g.error };

  if (!id || typeof id !== "string") {
    return { error: "Id inválido" };
  }

  if (id === g.sessionUserId) {
    return { error: "Você não pode desativar a si mesmo" };
  }

  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { role: true, ativo: true },
  });
  if (!alvo) return { error: "Usuário não encontrado" };

  if (alvo.role === "admin" && alvo.ativo) {
    const adminsAtivos = await countActiveAdmins();
    if (adminsAtivos <= 1) {
      return {
        error: "Não é possível — este é o último admin ativo do sistema",
      };
    }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { ativo: false },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Usuário não encontrado" };
    }
    return { error: genericError(err, "Erro ao desativar usuário") };
  }
}

export async function reativarUsuario(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g.error) return { error: g.error };

  if (!id || typeof id !== "string") {
    return { error: "Id inválido" };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { ativo: true },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Usuário não encontrado" };
    }
    return { error: genericError(err, "Erro ao reativar usuário") };
  }
}

const resetSenhaSchema = z
  .string()
  .min(6, "Senha deve ter ao menos 6 caracteres");

export async function resetarSenha(
  id: string,
  novaSenha: string,
): Promise<ActionResult> {
  const g = await guard();
  if (g.error) return { error: g.error };

  if (!id || typeof id !== "string") {
    return { error: "Id inválido" };
  }

  const parsed = resetSenhaSchema.safeParse(novaSenha);
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }

  try {
    const senhaHash = await bcrypt.hash(parsed.data, 10);
    await prisma.user.update({
      where: { id },
      data: { senhaHash },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Usuário não encontrado" };
    }
    return { error: genericError(err, "Erro ao resetar senha") };
  }
}

export async function excluirVaga(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g.error) return { error: g.error };

  if (!id || typeof id !== "string") {
    return { error: "Id inválido" };
  }

  try {
    await prisma.vaga.delete({
      where: { id },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath(`/vagas/${id}`);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Vaga não encontrada" };
    }
    return { error: genericError(err, "Erro ao excluir vaga") };
  }
}
