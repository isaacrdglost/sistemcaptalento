"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { descricaoStatusCandidato, logActivity } from "@/lib/activity";
import type { StatusCandidato, Vaga, Candidato } from "@prisma/client";
import type { Session } from "next-auth";

type ActionResult = { ok: true } | { error: string };

type LoadVagaOk = { ok: true; vaga: Vaga; session: Session };
type LoadVagaErr = { ok: false; error: string };
type LoadVagaResult = LoadVagaOk | LoadVagaErr;

type LoadCandidatoOk = {
  ok: true;
  candidato: Candidato & { vaga: Vaga };
  session: Session;
};
type LoadCandidatoErr = { ok: false; error: string };
type LoadCandidatoResult = LoadCandidatoOk | LoadCandidatoErr;

type SessionResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

const cuidSchema = z.string().min(1, "id inválido");

const marcoKeySchema = z.enum([
  "publicacao",
  "triagem",
  "entrevistas",
  "shortlistInterna",
  "entrega",
  "contato",
]);

const statusCandidatoSchema = z.enum([
  "triagem",
  "entrevista",
  "shortlist",
  "aprovado",
  "reprovado",
]);

const senioridadeEnum = z.enum([
  "estagio",
  "junior",
  "pleno",
  "senior",
  "especialista",
  "lideranca",
]);
const modeloEnum = z.enum(["presencial", "hibrido", "remoto"]);

const atualizarVagaSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório").max(200),
  clienteId: z.string().min(1, "Selecione um cliente"),
  obs: z.string().max(5000).nullable().optional(),
  dataBriefing: z.coerce.date(),
  dataPrazo: z.coerce.date().nullable().optional(),
  fluxo: z.enum(["padrao", "rapido"]),
  recrutadorId: z.string().min(1).optional(),
  senioridade: senioridadeEnum.nullable().optional(),
  modelo: modeloEnum.nullable().optional(),
  localizacao: z.string().max(200).nullable().optional(),
  salarioMin: z.number().nullable().optional(),
  salarioMax: z.number().nullable().optional(),
  area: z.string().max(100).nullable().optional(),
});

const urlOrNull = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL inválida" },
  );

const editarCandidatoSchema = z.object({
  nome: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  telefone: z.string().max(40).nullable().optional(),
  linkedinUrl: urlOrNull.optional(),
  linkCV: urlOrNull.optional(),
  cvArquivoUrl: urlOrNull.optional(),
  cvNomeArquivo: z.string().trim().max(200).nullable().optional(),
  cpf: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const digits = v.replace(/\D+/g, "");
      return digits.length === 0 ? null : digits;
    })
    .refine((v) => v === null || v.length === 11, {
      message: "CPF deve ter 11 dígitos",
    }),
  notas: z.string().max(5000).nullable().optional(),
  score: z.number().int().min(1).max(5).nullable().optional(),
});

export type EditarCandidatoInput = z.input<typeof editarCandidatoSchema>;

const analiseFichaSchema = z.object({
  cpf: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D+/g, ""))
    .refine((v) => v.length === 11, { message: "CPF deve ter 11 dígitos" }),
  resultado: z.enum(["limpa", "com_ocorrencias", "inconclusivo", "pendente"]),
  provedor: z.string().trim().min(1).max(50).default("escavador"),
  notas: z.string().trim().max(5000).nullable().optional(),
  linkExterno: urlOrNull.optional(),
});

export type AnaliseFichaInput = z.input<typeof analiseFichaSchema>;

async function getSessionOrError(): Promise<SessionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Não autenticado" };
  return { ok: true, session };
}

async function loadEditableVaga(vagaId: string): Promise<LoadVagaResult> {
  const parsed = cuidSchema.safeParse(vagaId);
  if (!parsed.success) return { ok: false, error: "ID inválido" };

  const sessionRes = await getSessionOrError();
  if (!sessionRes.ok) return { ok: false, error: sessionRes.error };
  const { session } = sessionRes;

  const vaga = await prisma.vaga.findUnique({ where: { id: parsed.data } });
  if (!vaga) return { ok: false, error: "Vaga não encontrada" };

  const canEdit =
    session.user.role === "admin" || vaga.recrutadorId === session.user.id;
  if (!canEdit) return { ok: false, error: "Sem permissão" };

  return { ok: true, vaga, session };
}

async function loadEditableVagaByCandidato(
  candidatoId: string,
): Promise<LoadCandidatoResult> {
  const parsed = cuidSchema.safeParse(candidatoId);
  if (!parsed.success) return { ok: false, error: "ID inválido" };

  const sessionRes = await getSessionOrError();
  if (!sessionRes.ok) return { ok: false, error: sessionRes.error };
  const { session } = sessionRes;

  const candidato = await prisma.candidato.findUnique({
    where: { id: parsed.data },
    include: { vaga: true },
  });
  if (!candidato) return { ok: false, error: "Candidato não encontrado" };

  const canEdit =
    session.user.role === "admin" ||
    candidato.vaga.recrutadorId === session.user.id;
  if (!canEdit) return { ok: false, error: "Sem permissão" };

  return { ok: true, candidato, session };
}

function revalidateVaga(vagaId: string) {
  revalidatePath(`/vagas/${vagaId}`);
  revalidatePath("/dashboard");
}

export async function publicarVaga(vagaId: string): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  const { vaga, session } = res;
  if (vaga.dataPublicacao) {
    revalidateVaga(vaga.id);
    return { ok: true };
  }
  await prisma.vaga.update({
    where: { id: vaga.id },
    data: { dataPublicacao: new Date() },
  });
  await logActivity({
    vagaId: vaga.id,
    autorId: session.user.id,
    tipo: "vaga_publicada",
    descricao: "publicou a vaga",
  });
  revalidateVaga(vaga.id);
  return { ok: true };
}

export async function confirmarTriagem(vagaId: string): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: { dataTriagemConfirmada: new Date() },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "triagem_confirmada",
    descricao: "confirmou a triagem",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function confirmarEntrevistas(
  vagaId: string,
): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: { dataEntrevistasConfirmada: new Date() },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "entrevistas_confirmadas",
    descricao: "confirmou as entrevistas",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function confirmarShortlistInterna(
  vagaId: string,
): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: { dataShortlistInterna: new Date() },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "shortlist_interna_registrada",
    descricao: "registrou a shortlist interna",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function marcarShortlistEntregue(
  vagaId: string,
): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: {
      shortlistEntregue: true,
      dataShortlistEntregue: new Date(),
    },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "shortlist_entregue",
    descricao: "entregou a shortlist ao cliente",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function registrarContatoCliente(
  vagaId: string,
): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: { dataUltimoContatoCliente: new Date() },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "contato_cliente_registrado",
    descricao: "registrou contato com o cliente",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function desfazerMarco(
  vagaId: string,
  key: "publicacao" | "triagem" | "entrevistas" | "shortlistInterna" | "entrega" | "contato",
): Promise<ActionResult> {
  const keyParsed = marcoKeySchema.safeParse(key);
  if (!keyParsed.success) return { error: "Marco inválido" };

  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };

  const data: Record<string, unknown> = {};
  switch (keyParsed.data) {
    case "publicacao":
      data.dataPublicacao = null;
      break;
    case "triagem":
      data.dataTriagemConfirmada = null;
      break;
    case "entrevistas":
      data.dataEntrevistasConfirmada = null;
      break;
    case "shortlistInterna":
      data.dataShortlistInterna = null;
      break;
    case "entrega":
      data.shortlistEntregue = false;
      data.dataShortlistEntregue = null;
      break;
    case "contato":
      data.dataUltimoContatoCliente = null;
      break;
  }

  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data,
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "marco_desfeito",
    descricao: `desfez o marco ${keyParsed.data}`,
    metadata: { marco: keyParsed.data },
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function encerrarVaga(vagaId: string): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: {
      encerrada: true,
      dataEncerramento: new Date(),
    },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "vaga_encerrada",
    descricao: "encerrou a vaga",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function reabrirVaga(vagaId: string): Promise<ActionResult> {
  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  await prisma.vaga.update({
    where: { id: res.vaga.id },
    data: {
      encerrada: false,
      dataEncerramento: null,
    },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "vaga_reaberta",
    descricao: "reabriu a vaga",
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function adicionarCandidato(
  vagaId: string,
  nome: string,
): Promise<ActionResult> {
  const nomeParsed = z
    .string()
    .min(1, "Nome obrigatório")
    .max(200)
    .safeParse(nome.trim());
  if (!nomeParsed.success) {
    return { error: nomeParsed.error.issues[0]?.message ?? "Nome inválido" };
  }

  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };

  const c = await prisma.candidato.create({
    data: {
      vagaId: res.vaga.id,
      nome: nomeParsed.data,
      status: "triagem",
    },
  });
  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "candidato_adicionado",
    descricao: `adicionou ${nomeParsed.data} como candidato`,
    metadata: { candidatoId: c.id, nome: nomeParsed.data },
  });
  revalidateVaga(res.vaga.id);
  return { ok: true };
}

export async function atualizarStatusCandidato(
  candidatoId: string,
  status: StatusCandidato,
): Promise<ActionResult> {
  const statusParsed = statusCandidatoSchema.safeParse(status);
  if (!statusParsed.success) return { error: "Status inválido" };

  const res = await loadEditableVagaByCandidato(candidatoId);
  if (!res.ok) return { error: res.error };

  const anterior = res.candidato.status;
  if (anterior === statusParsed.data) {
    revalidateVaga(res.candidato.vagaId);
    return { ok: true };
  }

  await prisma.candidato.update({
    where: { id: res.candidato.id },
    data: {
      status: statusParsed.data,
      etapaDesde: new Date(),
    },
  });
  await logActivity({
    vagaId: res.candidato.vagaId,
    autorId: res.session.user.id,
    tipo: "candidato_status_alterado",
    descricao: `moveu ${res.candidato.nome}: ${descricaoStatusCandidato(anterior)} → ${descricaoStatusCandidato(statusParsed.data)}`,
    metadata: {
      candidatoId: res.candidato.id,
      nome: res.candidato.nome,
      de: anterior,
      para: statusParsed.data,
    },
  });
  revalidateVaga(res.candidato.vagaId);
  return { ok: true };
}

export async function removerCandidato(
  candidatoId: string,
): Promise<ActionResult> {
  const res = await loadEditableVagaByCandidato(candidatoId);
  if (!res.ok) return { error: res.error };

  await prisma.candidato.delete({
    where: { id: res.candidato.id },
  });
  await logActivity({
    vagaId: res.candidato.vagaId,
    autorId: res.session.user.id,
    tipo: "candidato_removido",
    descricao: `removeu o candidato ${res.candidato.nome}`,
    metadata: { nome: res.candidato.nome },
  });
  revalidateVaga(res.candidato.vagaId);
  return { ok: true };
}

export type AtualizarVagaInput = {
  titulo: string;
  clienteId: string;
  obs: string | null;
  dataBriefing: Date | string;
  dataPrazo: Date | string | null;
  fluxo: "padrao" | "rapido";
  recrutadorId?: string;
  senioridade?:
    | "estagio"
    | "junior"
    | "pleno"
    | "senior"
    | "especialista"
    | "lideranca"
    | null;
  modelo?: "presencial" | "hibrido" | "remoto" | null;
  localizacao?: string | null;
  salarioMin?: number | null;
  salarioMax?: number | null;
  area?: string | null;
};

export async function atualizarVaga(
  vagaId: string,
  data: AtualizarVagaInput,
): Promise<ActionResult> {
  const parsed = atualizarVagaSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };
  const { session, vaga } = res;

  const cliente = await prisma.cliente.findUnique({
    where: { id: parsed.data.clienteId },
    select: { id: true, razaoSocial: true, ativo: true },
  });
  if (!cliente || !cliente.ativo) {
    return { error: "Cliente selecionado não existe ou está arquivado" };
  }

  const updateData: {
    titulo: string;
    cliente: string;
    clienteId: string;
    obs: string | null;
    dataBriefing: Date;
    dataPrazo: Date | null;
    fluxo: "padrao" | "rapido";
    recrutadorId?: string;
    senioridade: AtualizarVagaInput["senioridade"];
    modelo: AtualizarVagaInput["modelo"];
    localizacao: string | null;
    salarioMin: number | null;
    salarioMax: number | null;
    area: string | null;
  } = {
    titulo: parsed.data.titulo,
    cliente: cliente.razaoSocial,
    clienteId: cliente.id,
    obs: parsed.data.obs ?? null,
    dataBriefing: parsed.data.dataBriefing,
    dataPrazo: parsed.data.dataPrazo ?? null,
    fluxo: parsed.data.fluxo,
    senioridade: parsed.data.senioridade ?? null,
    modelo: parsed.data.modelo ?? null,
    localizacao: parsed.data.localizacao ?? null,
    salarioMin: parsed.data.salarioMin ?? null,
    salarioMax: parsed.data.salarioMax ?? null,
    area: parsed.data.area ?? null,
  };

  // Recrutador não pode enviar recrutadorId — ignoramos no servidor mesmo
  // se o cliente mandar (defesa contra client tampering).
  if (session.user.role === "admin" && parsed.data.recrutadorId) {
    if (parsed.data.recrutadorId !== vaga.recrutadorId) {
      const novoRecrutador = await prisma.user.findUnique({
        where: { id: parsed.data.recrutadorId },
        select: { id: true, ativo: true, role: true },
      });
      if (
        !novoRecrutador ||
        !novoRecrutador.ativo ||
        novoRecrutador.role !== "recruiter"
      ) {
        return { error: "Recrutadora inválida" };
      }
      updateData.recrutadorId = parsed.data.recrutadorId;
    }
  }

  await prisma.vaga.update({
    where: { id: vaga.id },
    data: updateData,
  });
  await logActivity({
    vagaId: vaga.id,
    autorId: session.user.id,
    tipo: "vaga_editada",
    descricao: "editou informações da vaga",
  });
  revalidateVaga(vaga.id);
  return { ok: true };
}

export async function editarCandidato(
  candidatoId: string,
  data: EditarCandidatoInput,
): Promise<ActionResult> {
  const parsed = editarCandidatoSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const res = await loadEditableVagaByCandidato(candidatoId);
  if (!res.ok) return { error: res.error };

  const before = res.candidato;
  const hadNotas = (before.notas ?? "").trim().length > 0;
  const willHaveNotas = (parsed.data.notas ?? "").trim().length > 0;

  await prisma.candidato.update({
    where: { id: res.candidato.id },
    data: {
      nome: parsed.data.nome.trim(),
      email: parsed.data.email ?? null,
      telefone: parsed.data.telefone ?? null,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      linkCV: parsed.data.linkCV ?? null,
      cvArquivoUrl: parsed.data.cvArquivoUrl ?? null,
      cvNomeArquivo: parsed.data.cvNomeArquivo ?? null,
      cpf: parsed.data.cpf ?? null,
      notas: parsed.data.notas ?? null,
      score: parsed.data.score ?? null,
    },
  });
  // Se o usuário só alterou notas, registra como "nota_adicionada" para ficar
  // mais expressivo no feed; caso contrário, "candidato_editado".
  const onlyNotas =
    willHaveNotas &&
    !hadNotas &&
    parsed.data.nome.trim() === before.nome &&
    (parsed.data.email ?? null) === before.email &&
    (parsed.data.telefone ?? null) === before.telefone &&
    (parsed.data.linkedinUrl ?? null) === before.linkedinUrl &&
    (parsed.data.linkCV ?? null) === before.linkCV &&
    (parsed.data.cvArquivoUrl ?? null) === before.cvArquivoUrl &&
    (parsed.data.cpf ?? null) === before.cpf &&
    (parsed.data.score ?? null) === before.score;

  await logActivity({
    vagaId: res.candidato.vagaId,
    autorId: res.session.user.id,
    tipo: onlyNotas ? "nota_adicionada" : "candidato_editado",
    descricao: onlyNotas
      ? `anotou sobre ${before.nome}`
      : `editou o candidato ${before.nome}`,
    metadata: { candidatoId: before.id, nome: before.nome },
  });
  revalidateVaga(res.candidato.vagaId);
  return { ok: true };
}

// --- Importação de candidatos a partir da agenda Google ---

const importarAgendaItemSchema = z.object({
  uid: z.string().min(1, "UID do evento é obrigatório"),
  nome: z.string().trim().min(1, "Nome obrigatório").max(200),
  email: z.string().trim().email().nullable().optional(),
  telefone: z.string().trim().max(40).nullable().optional(),
  status: statusCandidatoSchema.optional(),
  notas: z.string().trim().max(2000).nullable().optional(),
});
const importarAgendaSchema = z.object({
  itens: z.array(importarAgendaItemSchema).min(1).max(100),
});

export type ImportarAgendaInput = z.input<typeof importarAgendaSchema>;

export interface ImportarAgendaResult {
  ok: true;
  importados: number;
  duplicadosIgnorados: number;
}

export async function importarCandidatosDaAgenda(
  vagaId: string,
  data: ImportarAgendaInput,
): Promise<ImportarAgendaResult | { error: string }> {
  const parsed = importarAgendaSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const res = await loadEditableVaga(vagaId);
  if (!res.ok) return { error: res.error };

  // Deduplica por UID já existente na vaga — evita importações repetidas
  const uids = parsed.data.itens.map((i) => i.uid);
  const existentes = await prisma.candidato.findMany({
    where: {
      vagaId: res.vaga.id,
      fonteOrigem: "calendar",
      fonteExternoId: { in: uids },
    },
    select: { fonteExternoId: true },
  });
  const jaImportados = new Set(
    existentes.map((c) => c.fonteExternoId).filter((v): v is string => !!v),
  );

  const paraCriar = parsed.data.itens.filter((i) => !jaImportados.has(i.uid));

  if (paraCriar.length === 0) {
    return {
      ok: true,
      importados: 0,
      duplicadosIgnorados: parsed.data.itens.length,
    };
  }

  await prisma.candidato.createMany({
    data: paraCriar.map((i) => ({
      vagaId: res.vaga.id,
      nome: i.nome,
      email: i.email ?? null,
      telefone: i.telefone ?? null,
      notas: i.notas ?? null,
      status: i.status ?? "entrevista",
      fonteOrigem: "calendar",
      fonteExternoId: i.uid,
    })),
  });

  await logActivity({
    vagaId: res.vaga.id,
    autorId: res.session.user.id,
    tipo: "candidatos_importados_agenda",
    descricao: `importou ${paraCriar.length} candidato${paraCriar.length === 1 ? "" : "s"} da agenda`,
    metadata: {
      importados: paraCriar.length,
      duplicadosIgnorados: parsed.data.itens.length - paraCriar.length,
    },
  });

  revalidateVaga(res.vaga.id);

  return {
    ok: true,
    importados: paraCriar.length,
    duplicadosIgnorados: parsed.data.itens.length - paraCriar.length,
  };
}

// --- Análise de ficha (CPF) ---

export async function registrarAnaliseFicha(
  candidatoId: string,
  data: AnaliseFichaInput,
): Promise<ActionResult> {
  const parsed = analiseFichaSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const res = await loadEditableVagaByCandidato(candidatoId);
  if (!res.ok) return { error: res.error };

  await prisma.analiseFicha.create({
    data: {
      candidatoId: res.candidato.id,
      cpf: parsed.data.cpf,
      resultado: parsed.data.resultado,
      provedor: parsed.data.provedor,
      notas: parsed.data.notas ?? null,
      linkExterno: parsed.data.linkExterno ?? null,
      autorId: res.session.user.id,
    },
  });

  // Se o candidato não tinha CPF registrado ainda, grava também
  if (!res.candidato.cpf) {
    await prisma.candidato.update({
      where: { id: res.candidato.id },
      data: { cpf: parsed.data.cpf },
    });
  }

  const labelResultado: Record<string, string> = {
    limpa: "ficha limpa",
    com_ocorrencias: "com ocorrências",
    inconclusivo: "inconclusivo",
    pendente: "pendente",
  };

  await logActivity({
    vagaId: res.candidato.vagaId,
    autorId: res.session.user.id,
    tipo: "analise_ficha_registrada",
    descricao: `registrou análise de ficha de ${res.candidato.nome}: ${labelResultado[parsed.data.resultado] ?? parsed.data.resultado}`,
    metadata: {
      candidatoId: res.candidato.id,
      nome: res.candidato.nome,
      resultado: parsed.data.resultado,
      provedor: parsed.data.provedor,
    },
  });

  revalidateVaga(res.candidato.vagaId);
  return { ok: true };
}
