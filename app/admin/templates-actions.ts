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

const canalEnum = z.enum(["whatsapp", "email"]);

const templateSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome obrigatório").max(120),
    canal: canalEnum,
    assunto: z.string().trim().max(200).nullable().optional(),
    corpo: z.string().trim().min(2, "Corpo obrigatório").max(10000),
    ordem: z.number().int().min(0).max(9999).default(0),
    ativo: z.boolean().default(true),
  })
  .refine(
    (data) => data.canal !== "email" || (data.assunto && data.assunto.trim().length > 0),
    {
      message: "Assunto é obrigatório pra templates de email",
      path: ["assunto"],
    },
  );

export type TemplateInput = z.input<typeof templateSchema>;

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}

function genericError(err: unknown, fallback: string): string {
  console.error("[templates action]", err);
  return fallback;
}

function revalidate(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/comercial");
  revalidatePath("/comercial/leads");
}

export async function criarTemplate(
  data: TemplateInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminSession();
  if (!session) return { error: "Sem permissão" };

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const t = await prisma.mensagemTemplate.create({
      data: {
        nome: parsed.data.nome,
        canal: parsed.data.canal,
        assunto:
          parsed.data.canal === "email"
            ? parsed.data.assunto?.trim() ?? null
            : null,
        corpo: parsed.data.corpo,
        ordem: parsed.data.ordem,
        ativo: parsed.data.ativo,
      },
      select: { id: true },
    });
    revalidate();
    return { ok: true, id: t.id };
  } catch (err) {
    return { error: genericError(err, "Erro ao criar template") };
  }
}

export async function atualizarTemplate(
  id: string,
  data: TemplateInput,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { error: "Sem permissão" };

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.mensagemTemplate.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        canal: parsed.data.canal,
        assunto:
          parsed.data.canal === "email"
            ? parsed.data.assunto?.trim() ?? null
            : null,
        corpo: parsed.data.corpo,
        ordem: parsed.data.ordem,
        ativo: parsed.data.ativo,
      },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Template não encontrado" };
    }
    return { error: genericError(err, "Erro ao atualizar template") };
  }
}

export async function excluirTemplate(id: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { error: "Sem permissão" };
  try {
    await prisma.mensagemTemplate.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Template não encontrado" };
    }
    return { error: genericError(err, "Erro ao excluir template") };
  }
}
