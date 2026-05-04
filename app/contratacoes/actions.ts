"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { calcularFimGarantia } from "@/lib/garantia";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const modeloEnum = z.enum(["presencial", "hibrido", "remoto"]);

const registrarSchema = z.object({
  candidatoId: z.string().min(1, "Candidato inválido"),
  dataAdmissao: z.coerce.date({
    errorMap: () => ({ message: "Data de admissão inválida" }),
  }),
  admissaoEvidenciaUrl: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  cargoSnapshot: z.string().min(1, "Cargo obrigatório").max(200),
  salarioSnapshot: z.string().min(1, "Salário/condições obrigatório").max(200),
  modeloSnapshot: modeloEnum,
  escopoSnapshot: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  observacoesTermos: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export type RegistrarContratacaoInput = z.input<typeof registrarSchema>;

export async function registrarContratacao(
  input: RegistrarContratacaoInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOperacional();

  const parsed = registrarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  // dataAdmissao não pode estar muito no futuro (mais de 60 dias) nem muito
  // no passado (mais de 1 ano). Esses limites pegam erros de digitação.
  const agora = new Date();
  const limiteFuturo = new Date(agora);
  limiteFuturo.setDate(limiteFuturo.getDate() + 60);
  const limitePassado = new Date(agora);
  limitePassado.setFullYear(limitePassado.getFullYear() - 1);
  if (data.dataAdmissao > limiteFuturo) {
    return {
      ok: false,
      error: "Data de admissão muito no futuro (máx. 60 dias adiante).",
    };
  }
  if (data.dataAdmissao < limitePassado) {
    return {
      ok: false,
      error: "Data de admissão muito antiga (máx. 1 ano atrás).",
    };
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id: data.candidatoId },
    include: {
      vaga: { select: { id: true, clienteId: true, recrutadorId: true } },
      contratacao: { select: { id: true } },
    },
  });

  if (!candidato) return { ok: false, error: "Candidato não encontrado." };
  if (candidato.contratacao) {
    return {
      ok: false,
      error: "Esse candidato já tem uma contratação registrada.",
    };
  }
  if (!candidato.vaga.clienteId) {
    return {
      ok: false,
      error:
        "A vaga não está vinculada a um Cliente. Vincule antes de registrar a contratação.",
    };
  }

  const dataFimGarantia = calcularFimGarantia(data.dataAdmissao);

  const contratacao = await prisma.$transaction(async (tx) => {
    const created = await tx.contratacao.create({
      data: {
        candidatoId: candidato.id,
        vagaId: candidato.vaga.id,
        clienteId: candidato.vaga.clienteId!,
        recrutadoraId: candidato.vaga.recrutadorId,
        dataAdmissao: data.dataAdmissao,
        dataFimGarantia,
        admissaoEvidenciaUrl: data.admissaoEvidenciaUrl,
        cargoSnapshot: data.cargoSnapshot,
        salarioSnapshot: data.salarioSnapshot,
        modeloSnapshot: data.modeloSnapshot,
        escopoSnapshot: data.escopoSnapshot,
        observacoesTermos: data.observacoesTermos,
        status: "em_garantia",
      },
    });

    // Move candidato pra aprovado se ainda não estiver e encerra a vaga.
    if (candidato.status !== "aprovado") {
      await tx.candidato.update({
        where: { id: candidato.id },
        data: { status: "aprovado", etapaDesde: new Date() },
      });
    }

    await tx.vaga.update({
      where: { id: candidato.vaga.id },
      data: {
        encerrada: true,
        dataEncerramento: new Date(),
      },
    });

    return created;
  });

  await logActivity({
    vagaId: candidato.vaga.id,
    autorId: session.user.id,
    tipo: "candidato_contratado",
    descricao: `${candidato.nome} marcado como contratado (admissão ${data.dataAdmissao.toLocaleDateString("pt-BR")})`,
    metadata: {
      contratacaoId: contratacao.id,
      candidatoId: candidato.id,
      candidatoNome: candidato.nome,
      dataAdmissao: data.dataAdmissao.toISOString(),
      dataFimGarantia: dataFimGarantia.toISOString(),
    },
  });

  revalidatePath(`/vagas/${candidato.vaga.id}`);
  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${contratacao.id}`);
  revalidatePath("/dashboard");

  return { ok: true, data: { id: contratacao.id } };
}
