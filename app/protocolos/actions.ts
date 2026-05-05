"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import { logActivity } from "@/lib/activity";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

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

const modeloEnum = z.enum(["presencial", "hibrido", "remoto"]);

const optionalString = (max = 2000) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null));

// ============================================================================
// Abrir protocolo (recrutadora preenche tudo de uma vez: saída, exclusões,
// provas, decisão preliminar). Status final depende da decisão:
//  - DENTRO  → aguardando_cliente
//  - FORA    → encerrado (já fecha o caso)
// ============================================================================

const abrirSchema = z.object({
  vagaId: z.string().min(1),
  /** Candidato da própria vaga que saiu (se foi shortlist nossa). */
  profissionalSaiuCandidatoId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v && v.length > 0 ? v : null),
  profissionalSaiuNome: z
    .string()
    .min(2, "Nome do profissional é obrigatório")
    .max(200),

  // Snapshot dos termos da contratação que terminou
  cargoSnapshot: z.string().min(1, "Cargo é obrigatório").max(200),
  salarioSnapshot: optionalString(200),
  modeloSnapshot: modeloEnum.nullable().optional(),
  escopoSnapshot: optionalString(2000),
  dataAdmissaoOriginal: z.coerce.date().nullable().optional(),

  // Saída
  dataSaida: z.coerce.date(),
  motivoSaida: motivoSaidaEnum,
  motivoSaidaDetalhe: optionalString(2000),
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
  evidenciasUrls: z.array(z.string().url().max(500)).max(20).optional(),

  // Decisão preliminar
  dentroGarantia: z.boolean(),
  triagemJustificativa: z
    .string()
    .min(5, "Justifique a decisão (mín. 5 caracteres)")
    .max(2000),
});

export type AbrirProtocoloInput = z.input<typeof abrirSchema>;

export async function abrirProtocolo(
  input: AbrirProtocoloInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOperacional();
  const parsed = abrirSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const data = parsed.data;

  const vaga = await prisma.vaga.findUnique({
    where: { id: data.vagaId },
    select: {
      id: true,
      clienteId: true,
      recrutadorId: true,
      temGarantia: true,
    },
  });
  if (!vaga) return { ok: false, error: "Vaga não encontrada." };
  if (!vaga.clienteId) {
    return {
      ok: false,
      error: "Vaga sem cliente vinculado. Vincule antes de abrir o protocolo.",
    };
  }
  if (!vaga.temGarantia) {
    return {
      ok: false,
      error:
        "Esta vaga foi criada sem garantia de reposição. Edite a vaga e ative a garantia antes de abrir o protocolo.",
    };
  }

  const status = data.dentroGarantia
    ? ("aguardando_cliente" as const)
    : ("encerrado" as const);

  const protocolo = await prisma.protocoloReposicao.create({
    data: {
      vagaId: vaga.id,
      clienteId: vaga.clienteId,
      recrutadoraId: vaga.recrutadorId,
      abertoPorId: session.user.id,
      profissionalSaiuCandidatoId: data.profissionalSaiuCandidatoId,
      profissionalSaiuNome: data.profissionalSaiuNome,
      cargoSnapshot: data.cargoSnapshot,
      salarioSnapshot: data.salarioSnapshot,
      modeloSnapshot: data.modeloSnapshot ?? null,
      escopoSnapshot: data.escopoSnapshot,
      dataAdmissaoOriginal: data.dataAdmissaoOriginal ?? null,
      dataSaida: data.dataSaida,
      motivoSaida: data.motivoSaida,
      motivoSaidaDetalhe: data.motivoSaidaDetalhe,
      exclusoesAvaliadas: data.exclusoes
        ? (data.exclusoes as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      evidenciasUrls: data.evidenciasUrls ?? [],
      dentroGarantia: data.dentroGarantia,
      triagemJustificativa: data.triagemJustificativa,
      triadoPorId: session.user.id,
      triadoEm: new Date(),
      status,
    },
  });

  await logActivity({
    vagaId: vaga.id,
    autorId: session.user.id,
    tipo: "garantia_acionada",
    descricao: data.dentroGarantia
      ? `Protocolo aberto · DENTRO · aguardando confirmação do cliente — ${data.profissionalSaiuNome}`
      : `Protocolo aberto · FORA da garantia — ${data.profissionalSaiuNome}`,
    metadata: {
      protocoloId: protocolo.id,
      motivoSaida: data.motivoSaida,
      dataSaida: data.dataSaida.toISOString(),
      dentroGarantia: data.dentroGarantia,
    },
  });

  revalidatePath(`/vagas/${vaga.id}`);
  revalidatePath("/reposicoes");
  revalidatePath("/dashboard");

  return { ok: true, data: { id: protocolo.id } };
}

// ============================================================================
// Confirmação do cliente — ativa formalmente a garantia
// ============================================================================

const confirmarClienteSchema = z.object({
  protocoloId: z.string().min(1),
  clienteConfirmouEm: z.coerce.date(),
  clienteConfirmacaoVia: z.enum([
    "email",
    "whatsapp",
    "ligacao",
    "reuniao",
    "outro",
  ]),
  clienteConfirmacaoEvidenciaUrl: optionalString(500),
});

export type ConfirmarClienteInput = z.input<typeof confirmarClienteSchema>;

export async function confirmarPeloCliente(
  input: ConfirmarClienteInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = confirmarClienteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const data = parsed.data;

  const p = await prisma.protocoloReposicao.findUnique({
    where: { id: data.protocoloId },
    select: { id: true, status: true, vagaId: true, profissionalSaiuNome: true },
  });
  if (!p) return { ok: false, error: "Protocolo não encontrado." };
  if (p.status !== "aguardando_cliente") {
    return {
      ok: false,
      error:
        "Confirmação do cliente só pode ser registrada em protocolo aguardando confirmação.",
    };
  }

  await prisma.protocoloReposicao.update({
    where: { id: p.id },
    data: {
      clienteConfirmou: true,
      clienteConfirmouEm: data.clienteConfirmouEm,
      clienteConfirmacaoVia: data.clienteConfirmacaoVia,
      clienteConfirmacaoEvidenciaUrl: data.clienteConfirmacaoEvidenciaUrl,
      status: "ativada",
    },
  });

  await logActivity({
    vagaId: p.vagaId,
    autorId: session.user.id,
    tipo: "protocolo_ativado",
    descricao: `Garantia ATIVADA — cliente confirmou via ${data.clienteConfirmacaoVia} (${p.profissionalSaiuNome})`,
    metadata: {
      protocoloId: p.id,
      via: data.clienteConfirmacaoVia,
      confirmadoEm: data.clienteConfirmouEm.toISOString(),
    },
  });

  revalidatePath(`/vagas/${p.vagaId}`);
  revalidatePath("/reposicoes");
  revalidatePath("/dashboard");

  return { ok: true };
}

// ============================================================================
// Caminho da reposição: abrir vaga nova com prazo de 30 dias úteis
// ============================================================================

export async function abrirVagaReposicao(
  protocoloId: string,
): Promise<ActionResult<{ vagaId: string }>> {
  const session = await requireOperacional();

  const p = await prisma.protocoloReposicao.findUnique({
    where: { id: protocoloId },
    include: {
      vaga: {
        select: {
          id: true,
          titulo: true,
          cliente: true,
          area: true,
          localizacao: true,
          senioridade: true,
        },
      },
    },
  });
  if (!p) return { ok: false, error: "Protocolo não encontrado." };
  if (p.status !== "ativada") {
    return {
      ok: false,
      error: "Só é possível abrir vaga de reposição em protocolo ativado.",
    };
  }
  if (p.reposicaoVagaId) {
    return { ok: false, error: "Já existe uma vaga de reposição aberta." };
  }

  const novaVaga = await prisma.vaga.create({
    data: {
      titulo: `[Reposição] ${p.cargoSnapshot}`,
      cliente: p.vaga.cliente,
      clienteId: p.clienteId,
      recrutadorId: p.recrutadoraId ?? session.user.id,
      dataBriefing: new Date(),
      // Fluxo padrão = 30 dias úteis para reposição de qualidade
      fluxo: "padrao",
      modelo: p.modeloSnapshot,
      senioridade: p.vaga.senioridade,
      localizacao: p.vaga.localizacao,
      area: p.vaga.area,
      // A vaga de reposição é a "nova garantia" — sim, a empresa cobre
      // novamente caso este substituto saia em até 30d. (Ajuste comercial.)
      temGarantia: true,
      obs: `Reposição da contratação anterior (${p.profissionalSaiuNome}, vaga ${p.vagaId}). Sem cobrança — coberto pelo protocolo de garantia.\n\nEscopo congelado: ${p.escopoSnapshot ?? "—"}\nSalário: ${p.salarioSnapshot ?? "—"}`,
    },
  });

  await prisma.protocoloReposicao.update({
    where: { id: p.id },
    data: {
      reposicaoVagaId: novaVaga.id,
      caminhoReposicao: "vaga_nova",
    },
  });

  await logActivity({
    vagaId: novaVaga.id,
    autorId: session.user.id,
    tipo: "reposicao_aberta",
    descricao: `Vaga de reposição aberta — coberta pelo protocolo de ${p.profissionalSaiuNome}`,
    metadata: {
      protocoloId: p.id,
      vagaOriginalId: p.vagaId,
    },
  });

  revalidatePath(`/vagas/${p.vagaId}`);
  revalidatePath(`/vagas/${novaVaga.id}`);
  revalidatePath("/reposicoes");
  revalidatePath("/dashboard");

  return { ok: true, data: { vagaId: novaVaga.id } };
}

// ============================================================================
// Concluir reposição: vincula candidato substituto (da MESMA vaga ou da
// vaga nova de reposição). Encerra o protocolo como reposto.
// ============================================================================

const concluirSchema = z.object({
  protocoloId: z.string().min(1),
  candidatoSubstitutoId: z.string().min(1),
});

export type ConcluirInput = z.input<typeof concluirSchema>;

export async function concluirReposicao(
  input: ConcluirInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = concluirSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const data = parsed.data;

  const p = await prisma.protocoloReposicao.findUnique({
    where: { id: data.protocoloId },
    select: {
      id: true,
      status: true,
      vagaId: true,
      reposicaoVagaId: true,
      profissionalSaiuCandidatoId: true,
      profissionalSaiuNome: true,
    },
  });
  if (!p) return { ok: false, error: "Protocolo não encontrado." };
  if (p.status !== "ativada") {
    return {
      ok: false,
      error: "Reposição só pode ser concluída em protocolo ativado.",
    };
  }

  const subst = await prisma.candidato.findUnique({
    where: { id: data.candidatoSubstitutoId },
    select: { id: true, nome: true, vagaId: true },
  });
  if (!subst) return { ok: false, error: "Candidato substituto não encontrado." };
  if (subst.id === p.profissionalSaiuCandidatoId) {
    return {
      ok: false,
      error: "O substituto não pode ser o mesmo candidato que saiu.",
    };
  }
  const vagaPermitida =
    subst.vagaId === p.vagaId ||
    (p.reposicaoVagaId !== null && subst.vagaId === p.reposicaoVagaId);
  if (!vagaPermitida) {
    return {
      ok: false,
      error:
        "O substituto precisa ser candidato da vaga original ou da vaga de reposição.",
    };
  }

  const caminhoFinal =
    subst.vagaId === p.vagaId ? "shortlist" : "vaga_nova";

  await prisma.protocoloReposicao.update({
    where: { id: p.id },
    data: {
      status: "reposto",
      reposicaoCandidatoId: subst.id,
      reposicaoConcluidaEm: new Date(),
      caminhoReposicao: caminhoFinal,
    },
  });

  await logActivity({
    vagaId: p.reposicaoVagaId ?? p.vagaId,
    autorId: session.user.id,
    tipo: "reposicao_concluida",
    descricao: `Reposição concluída — ${subst.nome} cobre a saída de ${p.profissionalSaiuNome}`,
    metadata: {
      protocoloId: p.id,
      substitutoId: subst.id,
      caminho: caminhoFinal,
    },
  });

  revalidatePath(`/vagas/${p.vagaId}`);
  if (p.reposicaoVagaId) revalidatePath(`/vagas/${p.reposicaoVagaId}`);
  revalidatePath("/reposicoes");
  revalidatePath("/dashboard");

  return { ok: true };
}

// ============================================================================
// Encerrar protocolo sem reposição (cliente desistiu, indisponibilidade etc).
// ============================================================================

const encerrarSchema = z.object({
  protocoloId: z.string().min(1),
  motivoEncerramento: z.string().min(5).max(2000),
});

export type EncerrarInput = z.input<typeof encerrarSchema>;

export async function encerrarProtocolo(
  input: EncerrarInput,
): Promise<ActionResult> {
  const session = await requireOperacional();
  const parsed = encerrarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const data = parsed.data;

  const p = await prisma.protocoloReposicao.findUnique({
    where: { id: data.protocoloId },
    select: { id: true, status: true, vagaId: true, profissionalSaiuNome: true },
  });
  if (!p) return { ok: false, error: "Protocolo não encontrado." };
  if (p.status === "reposto" || p.status === "encerrado") {
    return { ok: false, error: "Protocolo já está finalizado." };
  }

  await prisma.protocoloReposicao.update({
    where: { id: p.id },
    data: { status: "encerrado" },
  });

  await logActivity({
    vagaId: p.vagaId,
    autorId: session.user.id,
    tipo: "protocolo_encerrado",
    descricao: `Protocolo encerrado sem reposição — ${p.profissionalSaiuNome}`,
    metadata: {
      protocoloId: p.id,
      motivo: data.motivoEncerramento,
    },
  });

  revalidatePath(`/vagas/${p.vagaId}`);
  revalidatePath("/reposicoes");

  return { ok: true };
}
