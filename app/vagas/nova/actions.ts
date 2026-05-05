"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  titulo: z.string().min(2, "Título deve ter ao menos 2 caracteres"),
  clienteId: z.string().min(1, "Selecione um cliente"),
  obs: z.string().optional(),
  dataBriefing: z.string().min(1, "Data do briefing é obrigatória"),
  dataPrazo: z.string().optional(),
  fluxo: z.enum(["padrao", "rapido"]).default("padrao"),
  recrutadorId: z.string().optional(),
  temGarantia: z.boolean().optional().default(false),
});

export type CriarVagaInput = z.input<typeof schema>;

type CriarVagaResult = { ok: true; id: string } | { error: string };

function parseDateInput(value: string): Date {
  // input type=date devolve "YYYY-MM-DD" — fixar meio-dia local evita UTC shift
  return new Date(`${value}T12:00:00`);
}

export async function criarVaga(
  formData: CriarVagaInput,
): Promise<CriarVagaResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Não autenticado" };
  }

  const parsed = schema.safeParse(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  let recrutadorId: string;
  if (session.user.role === "recruiter") {
    // Recrutador abrindo vaga — recrutadorId é forçado a ele mesmo,
    // ignorando qualquer valor vindo do payload.
    recrutadorId = session.user.id;
  } else {
    // Admin — precisa escolher um recrutador ativo (role=recruiter).
    // Admin não pode abrir vaga em nome de si mesmo (admin não é recrutador).
    if (!data.recrutadorId) {
      return { error: "Selecione uma recrutadora para a vaga" };
    }
    const alvo = await prisma.user.findUnique({
      where: { id: data.recrutadorId },
      select: { id: true, ativo: true, role: true },
    });
    if (!alvo || !alvo.ativo || alvo.role !== "recruiter") {
      return { error: "Recrutadora selecionada não existe ou está inativa" };
    }
    recrutadorId = alvo.id;
  }

  let dataBriefing: Date;
  try {
    dataBriefing = parseDateInput(data.dataBriefing);
    if (Number.isNaN(dataBriefing.getTime())) {
      return { error: "Data do briefing inválida" };
    }
  } catch {
    return { error: "Data do briefing inválida" };
  }

  let dataPrazo: Date | null = null;
  if (data.dataPrazo && data.dataPrazo.length > 0) {
    const d = parseDateInput(data.dataPrazo);
    if (Number.isNaN(d.getTime())) {
      return { error: "Data de prazo inválida" };
    }
    dataPrazo = d;
  }

  // Valida o cliente selecionado: precisa existir e estar ativo.
  const cliente = await prisma.cliente.findUnique({
    where: { id: data.clienteId },
    select: { id: true, razaoSocial: true, ativo: true },
  });
  if (!cliente || !cliente.ativo) {
    return { error: "Cliente selecionado não existe ou está arquivado" };
  }

  try {
    const novaVaga = await prisma.vaga.create({
      data: {
        titulo: data.titulo.trim(),
        // cliente (string) é mantido denormalizado a partir da razão social
        // do Cliente escolhido — facilita listagens sem join pesado.
        cliente: cliente.razaoSocial,
        clienteId: cliente.id,
        obs: data.obs?.trim() ? data.obs.trim() : null,
        dataBriefing,
        dataPrazo,
        fluxo: data.fluxo,
        temGarantia: data.temGarantia,
        recrutadorId,
      },
      select: { id: true },
    });

    await logActivity({
      vagaId: novaVaga.id,
      autorId: session.user.id,
      tipo: "vaga_criada",
      descricao: "criou a vaga",
    });
    revalidatePath("/dashboard");
    return { ok: true, id: novaVaga.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar vaga";
    return { error: msg };
  }
}
