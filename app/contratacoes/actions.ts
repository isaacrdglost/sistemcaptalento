"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

    // Check-ins automáticos D+7, D+15, D+25 (Fase 3)
    const checkInsData = [7, 15, 25].map((diasApos) => {
      const agendado = new Date(data.dataAdmissao);
      agendado.setDate(agendado.getDate() + diasApos);
      return {
        contratacaoId: created.id,
        diasApos,
        agendadoPara: agendado,
      };
    });
    await tx.checkIn.createMany({ data: checkInsData });

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

// ============================================================================
// FASE 2 — Acionamento, triagem e reposição
// ============================================================================

const motivoSaidaEnum = z.enum([
  "pedido_cliente",
  "pedido_candidato",
  "acordo_mutuo",
  "inadequacao_tecnica",
  "inadequacao_comportamental",
  "reestruturacao_cliente",
  "mudanca_escopo",
  "falha_onboarding_cliente",
  "outro",
]);

const acionarSchema = z.object({
  contratacaoId: z.string().min(1),
  dataSaida: z.coerce.date(),
  motivoSaida: motivoSaidaEnum,
  motivoSaidaDetalhe: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  /** Checklist das 3 exclusões da proposta — boolean + evidência opcional. */
  exclusoes: z
    .object({
      mudancaEscopo: z.boolean(),
      mudancaEscopoEvidencia: z.string().max(2000).optional(),
      reestruturacao: z.boolean(),
      reestruturacaoEvidencia: z.string().max(2000).optional(),
      falhaOnboarding: z.boolean(),
      falhaOnboardingEvidencia: z.string().max(2000).optional(),
    })
    .optional(),
});

export type AcionarGarantiaInput = z.input<typeof acionarSchema>;

export async function acionarGarantia(
  input: AcionarGarantiaInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = acionarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  const c = await prisma.contratacao.findUnique({
    where: { id: data.contratacaoId },
    include: {
      candidato: { select: { nome: true } },
      vaga: { select: { id: true } },
    },
  });
  if (!c) return { ok: false, error: "Contratação não encontrada." };
  if (c.status !== "em_garantia" && c.status !== "garantia_ok") {
    return {
      ok: false,
      error: "Só dá pra acionar uma contratação que ainda está em garantia ou recém-finalizada.",
    };
  }
  if (data.dataSaida < c.dataAdmissao) {
    return {
      ok: false,
      error: "A data de saída não pode ser anterior à admissão.",
    };
  }

  await prisma.contratacao.update({
    where: { id: c.id },
    data: {
      status: "garantia_acionada",
      dataSaida: data.dataSaida,
      motivoSaida: data.motivoSaida,
      motivoSaidaDetalhe: data.motivoSaidaDetalhe,
      exclusoesAvaliadas: data.exclusoes
        ? (data.exclusoes as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      // limpa triagem anterior se for re-acionamento
      saidaDentroGarantia: null,
      saidaDentroGarantiaJustif: null,
      triadoPorId: null,
      triadoEm: null,
    },
  });

  await logActivity({
    vagaId: c.vaga.id,
    autorId: session.user.id,
    tipo: "garantia_acionada",
    descricao: `Garantia acionada para ${c.candidato.nome} — saída em ${data.dataSaida.toLocaleDateString("pt-BR")}`,
    metadata: {
      contratacaoId: c.id,
      motivoSaida: data.motivoSaida,
      dataSaida: data.dataSaida.toISOString(),
      exclusoes: data.exclusoes ?? null,
    },
  });

  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${c.id}`);
  revalidatePath("/dashboard");

  return { ok: true };
}

const triarSchema = z.object({
  contratacaoId: z.string().min(1),
  dentroGarantia: z.boolean(),
  justificativa: z.string().min(5, "Justifique a decisão (mín. 5 caracteres)").max(2000),
});

export type TriarGarantiaInput = z.input<typeof triarSchema>;

export async function triarGarantia(
  input: TriarGarantiaInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = triarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  const c = await prisma.contratacao.findUnique({
    where: { id: data.contratacaoId },
    include: {
      candidato: { select: { nome: true } },
      vaga: { select: { id: true } },
    },
  });
  if (!c) return { ok: false, error: "Contratação não encontrada." };
  if (c.status !== "garantia_acionada") {
    return {
      ok: false,
      error: "Só dá pra triar uma garantia que foi acionada.",
    };
  }

  await prisma.contratacao.update({
    where: { id: c.id },
    data: {
      saidaDentroGarantia: data.dentroGarantia,
      saidaDentroGarantiaJustif: data.justificativa,
      triadoPorId: session.user.id,
      triadoEm: new Date(),
      // Se for FORA da garantia, encerra direto. Se DENTRO, fica em
      // garantia_acionada até abrir a reposição.
      ...(data.dentroGarantia ? {} : { status: "encerrado" as const }),
    },
  });

  await logActivity({
    vagaId: c.vaga.id,
    autorId: session.user.id,
    tipo: "garantia_triada",
    descricao: `Triagem da garantia: ${data.dentroGarantia ? "DENTRO" : "FORA"} da cobertura — ${c.candidato.nome}`,
    metadata: {
      contratacaoId: c.id,
      dentroGarantia: data.dentroGarantia,
      justificativa: data.justificativa,
    },
  });

  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${c.id}`);

  return { ok: true };
}

export async function criarReposicaoVaga(
  contratacaoId: string,
): Promise<ActionResult<{ vagaId: string }>> {
  const session = await requireOperacional();
  if (!contratacaoId) return { ok: false, error: "ID inválido" };

  const c = await prisma.contratacao.findUnique({
    where: { id: contratacaoId },
    include: {
      candidato: { select: { nome: true } },
      vaga: {
        select: {
          id: true,
          titulo: true,
          cliente: true,
          area: true,
          localizacao: true,
          senioridade: true,
          fluxo: true,
        },
      },
    },
  });
  if (!c) return { ok: false, error: "Contratação não encontrada." };
  if (c.status !== "garantia_acionada" || c.saidaDentroGarantia !== true) {
    return {
      ok: false,
      error:
        "Só dá pra abrir reposição quando a garantia foi acionada e triada como DENTRO da cobertura.",
    };
  }
  if (c.reposicaoVagaId) {
    return {
      ok: false,
      error: "Já existe uma vaga de reposição aberta pra esta contratação.",
    };
  }

  // Cria nova Vaga pré-preenchida com os snapshots
  const novaVaga = await prisma.vaga.create({
    data: {
      titulo: `[Reposição] ${c.cargoSnapshot}`,
      cliente: c.vaga.cliente,
      clienteId: c.clienteId,
      recrutadorId: c.recrutadoraId ?? session.user.id,
      dataBriefing: new Date(),
      fluxo: c.vaga.fluxo,
      modelo: c.modeloSnapshot,
      senioridade: c.vaga.senioridade,
      localizacao: c.vaga.localizacao,
      area: c.vaga.area,
      obs: `Reposição da contratação de ${c.candidato.nome} (vaga original ${c.vaga.id}). Sem cobrança — coberto pela garantia da proposta.\n\nEscopo congelado: ${c.escopoSnapshot ?? "—"}\nSalário: ${c.salarioSnapshot}`,
    },
  });

  await prisma.contratacao.update({
    where: { id: c.id },
    data: { reposicaoVagaId: novaVaga.id },
  });

  await logActivity({
    vagaId: novaVaga.id,
    autorId: session.user.id,
    tipo: "reposicao_aberta",
    descricao: `Vaga de reposição aberta — coberta pela garantia de ${c.candidato.nome}`,
    metadata: {
      contratacaoId: c.id,
      vagaOriginalId: c.vaga.id,
    },
  });

  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${c.id}`);
  revalidatePath("/dashboard");

  return { ok: true, data: { vagaId: novaVaga.id } };
}

const concluirReposicaoSchema = z.object({
  contratacaoId: z.string().min(1),
  candidatoNovoId: z.string().min(1),
});

export type ConcluirReposicaoInput = z.input<typeof concluirReposicaoSchema>;

export async function concluirReposicao(
  input: ConcluirReposicaoInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = concluirReposicaoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  const c = await prisma.contratacao.findUnique({
    where: { id: data.contratacaoId },
    include: {
      candidato: { select: { nome: true } },
      vaga: { select: { id: true } },
    },
  });
  if (!c) return { ok: false, error: "Contratação não encontrada." };
  if (!c.reposicaoVagaId) {
    return { ok: false, error: "Nenhuma vaga de reposição aberta." };
  }

  const candidatoNovo = await prisma.candidato.findUnique({
    where: { id: data.candidatoNovoId },
    select: { id: true, nome: true, vagaId: true },
  });
  if (!candidatoNovo) {
    return { ok: false, error: "Candidato de reposição não encontrado." };
  }
  if (candidatoNovo.vagaId !== c.reposicaoVagaId) {
    return {
      ok: false,
      error: "O candidato precisa estar associado à vaga de reposição.",
    };
  }

  await prisma.contratacao.update({
    where: { id: c.id },
    data: {
      status: "reposto",
      reposicaoCandidatoId: candidatoNovo.id,
      reposicaoConcluidaEm: new Date(),
    },
  });

  await logActivity({
    vagaId: c.reposicaoVagaId,
    autorId: session.user.id,
    tipo: "reposicao_concluida",
    descricao: `Reposição concluída — ${candidatoNovo.nome} cobre a saída de ${c.candidato.nome}`,
    metadata: {
      contratacaoId: c.id,
      candidatoNovoId: candidatoNovo.id,
      vagaOriginalId: c.vaga.id,
    },
  });

  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${c.id}`);

  return { ok: true };
}

// ============================================================================
// FASE 3 — Check-ins + termo
// ============================================================================

const registrarCheckInSchema = z.object({
  checkInId: z.string().min(1),
  resultado: z.enum(["ok", "atencao", "alerta"]),
  observacao: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export type RegistrarCheckInInput = z.input<typeof registrarCheckInSchema>;

export async function registrarCheckIn(
  input: RegistrarCheckInInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = registrarCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  const ci = await prisma.checkIn.findUnique({
    where: { id: data.checkInId },
    include: {
      contratacao: {
        select: {
          id: true,
          vagaId: true,
          candidato: { select: { nome: true } },
        },
      },
    },
  });
  if (!ci) return { ok: false, error: "Check-in não encontrado." };
  if (ci.realizadoEm) {
    return { ok: false, error: "Esse check-in já foi registrado." };
  }

  await prisma.checkIn.update({
    where: { id: ci.id },
    data: {
      realizadoEm: new Date(),
      resultado: data.resultado,
      observacao: data.observacao,
      autorId: session.user.id,
    },
  });

  await logActivity({
    vagaId: ci.contratacao.vagaId,
    autorId: session.user.id,
    tipo: "checkin_pos_contratacao",
    descricao: `Check-in D+${ci.diasApos} — ${ci.contratacao.candidato.nome} (${data.resultado})`,
    metadata: {
      contratacaoId: ci.contratacao.id,
      checkInId: ci.id,
      resultado: data.resultado,
      diasApos: ci.diasApos,
    },
  });

  revalidatePath("/contratacoes");
  revalidatePath(`/contratacoes/${ci.contratacao.id}`);
  revalidatePath("/dashboard");

  return { ok: true };
}

