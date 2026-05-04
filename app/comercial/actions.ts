"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  descricaoEstagioLead,
  descricaoOrigemLead,
  logLeadActivity,
} from "@/lib/activity-lead";
import {
  cnpjOptional,
  emailOptional,
  urlOrNullOptional,
} from "@/lib/validators";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : T))
  | { error: string };

const origemEnum = z.enum([
  "prospeccao_ativa",
  "indicacao",
  "site",
  "redes_sociais",
  "linkedin",
  "evento",
  "whatsapp",
  "outro",
]);
const estagioEnum = z.enum([
  "novo",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
]);

const leadSchema = z.object({
  razaoSocial: z.string().trim().min(2, "Razão social obrigatória").max(200),
  nomeFantasia: z.string().trim().max(200).nullable().optional(),
  cnpj: cnpjOptional,
  segmento: z.string().trim().max(100).nullable().optional(),
  site: urlOrNullOptional,

  contatoNome: z.string().trim().max(200).nullable().optional(),
  contatoCargo: z.string().trim().max(200).nullable().optional(),
  email: emailOptional,
  telefone: z.string().trim().max(40).nullable().optional(),
  linkedinUrl: urlOrNullOptional,

  mensagem: z.string().max(5000).nullable().optional(),
  utmSource: z.string().trim().max(120).nullable().optional(),
  utmMedium: z.string().trim().max(120).nullable().optional(),
  utmCampaign: z.string().trim().max(120).nullable().optional(),

  origem: origemEnum.default("outro"),
  origemDescricao: z.string().trim().max(200).nullable().optional(),
  obs: z.string().max(5000).nullable().optional(),
});

export type LeadInput = z.input<typeof leadSchema>;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}

function genericError(err: unknown, fallback: string): string {
  console.error("[comercial action]", err);
  return fallback;
}

/**
 * Verifica permissão sobre o lead. Comercial só atua sobre leads próprios ou
 * sem responsável. Admin atua em qualquer um.
 */
function podeAgirSobreLead(opts: {
  role: string;
  userId: string;
  responsavelId: string | null;
}): boolean {
  if (opts.role === "admin") return true;
  if (opts.role !== "comercial") return false;
  return (
    opts.responsavelId === null || opts.responsavelId === opts.userId
  );
}

function revalidate(leadId?: string) {
  revalidatePath("/comercial");
  revalidatePath("/comercial/leads");
  if (leadId) revalidatePath(`/comercial/leads/${leadId}`);
}

export async function criarLead(
  data: LeadInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  if (
    session.user.role !== "comercial" &&
    session.user.role !== "admin"
  ) {
    return { error: "Sem permissão" };
  }

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const lead = await prisma.lead.create({
      data: {
        razaoSocial: parsed.data.razaoSocial,
        nomeFantasia: parsed.data.nomeFantasia ?? null,
        cnpj: parsed.data.cnpj ?? null,
        segmento: parsed.data.segmento ?? null,
        site: parsed.data.site ?? null,
        contatoNome: parsed.data.contatoNome ?? null,
        contatoCargo: parsed.data.contatoCargo ?? null,
        email: parsed.data.email ?? null,
        telefone: parsed.data.telefone ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
        mensagem: parsed.data.mensagem ?? null,
        utmSource: parsed.data.utmSource ?? null,
        utmMedium: parsed.data.utmMedium ?? null,
        utmCampaign: parsed.data.utmCampaign ?? null,
        origem: parsed.data.origem,
        origemDescricao: parsed.data.origemDescricao ?? null,
        obs: parsed.data.obs ?? null,
        // Quem cria assume responsabilidade. Admin pode reatribuir depois.
        responsavelId: session.user.id,
      },
      select: { id: true },
    });
    await logLeadActivity({
      leadId: lead.id,
      autorId: session.user.id,
      tipo: "nota",
      descricao: `criou o lead ${parsed.data.razaoSocial}`,
    });
    revalidate(lead.id);
    return { ok: true, id: lead.id };
  } catch (err) {
    return { error: genericError(err, "Erro ao criar lead") };
  }
}

export async function atualizarLead(
  id: string,
  data: LeadInput,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.lead.update({
      where: { id },
      data: {
        razaoSocial: parsed.data.razaoSocial,
        nomeFantasia: parsed.data.nomeFantasia ?? null,
        cnpj: parsed.data.cnpj ?? null,
        segmento: parsed.data.segmento ?? null,
        site: parsed.data.site ?? null,
        contatoNome: parsed.data.contatoNome ?? null,
        contatoCargo: parsed.data.contatoCargo ?? null,
        email: parsed.data.email ?? null,
        telefone: parsed.data.telefone ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
        mensagem: parsed.data.mensagem ?? null,
        utmSource: parsed.data.utmSource ?? null,
        utmMedium: parsed.data.utmMedium ?? null,
        utmCampaign: parsed.data.utmCampaign ?? null,
        origem: parsed.data.origem,
        origemDescricao: parsed.data.origemDescricao ?? null,
        obs: parsed.data.obs ?? null,
      },
    });
    revalidate(id);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Lead não encontrado" };
    }
    return { error: genericError(err, "Erro ao atualizar lead") };
  }
}

export async function pegarLead(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  if (
    session.user.role !== "comercial" &&
    session.user.role !== "admin"
  ) {
    return { error: "Sem permissão" };
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true, razaoSocial: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (lead.responsavelId && lead.responsavelId !== session.user.id) {
    return { error: "Esse lead já tem responsável" };
  }
  if (lead.responsavelId === session.user.id) {
    revalidate(id);
    return { ok: true };
  }

  await prisma.lead.update({
    where: { id },
    data: { responsavelId: session.user.id },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "lead_atribuido",
    descricao: `assumiu o lead ${lead.razaoSocial}`,
    metadata: { tipo: "auto-atribuicao" },
  });
  revalidate(id);
  return { ok: true };
}

export async function transferirLead(
  id: string,
  novoResponsavelId: string | null,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  if (session.user.role !== "admin") {
    return { error: "Apenas admin pode transferir leads" };
  }

  if (novoResponsavelId) {
    const alvo = await prisma.user.findUnique({
      where: { id: novoResponsavelId },
      select: { id: true, ativo: true, role: true },
    });
    if (
      !alvo ||
      !alvo.ativo ||
      (alvo.role !== "comercial" && alvo.role !== "admin")
    ) {
      return { error: "Responsável inválido" };
    }
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, razaoSocial: true, responsavelId: true },
  });
  if (!lead) return { error: "Lead não encontrado" };

  await prisma.lead.update({
    where: { id },
    data: { responsavelId: novoResponsavelId },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "lead_atribuido",
    descricao: novoResponsavelId
      ? `transferiu o lead pra outro responsável`
      : `removeu o responsável do lead`,
    metadata: {
      de: lead.responsavelId,
      para: novoResponsavelId,
    },
  });
  revalidate(id);
  return { ok: true };
}

export async function arquivarLead(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true, razaoSocial: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.lead.update({
    where: { id },
    data: { arquivado: true, dataArquivamento: new Date() },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "lead_arquivado",
    descricao: `arquivou o lead ${lead.razaoSocial}`,
  });
  revalidate(id);
  return { ok: true };
}

export async function reabrirLead(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.lead.update({
    where: { id },
    data: { arquivado: false, dataArquivamento: null },
  });
  revalidate(id);
  return { ok: true };
}

export async function excluirLead(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };
  if (session.user.role !== "admin") {
    return { error: "Apenas admin pode excluir leads" };
  }
  try {
    await prisma.lead.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { error: "Lead não encontrado" };
    }
    return { error: genericError(err, "Erro ao excluir lead") };
  }
}

// === Pipeline: mover estágio / ganhar / perder ===

const estagioMoveSchema = z.enum([
  "novo",
  "qualificado",
  "proposta",
  "negociacao",
]);

/**
 * Move o lead entre estágios ATIVOS (novo/qualificado/proposta/negociacao).
 * Mover pra ganho/perdido é proibido aqui — força usar ganharLead/perderLead
 * pra coletar metadados (cliente vinculado, motivo).
 */
export async function moverEstagio(
  id: string,
  novoEstagio: string,
): Promise<ActionResult> {
  const parsedEstagio = estagioMoveSchema.safeParse(novoEstagio);
  if (!parsedEstagio.success) {
    return {
      error:
        "Pra marcar como ganho ou perdido, use os botões dedicados no detalhe do lead.",
    };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      responsavelId: true,
      razaoSocial: true,
      estagio: true,
    },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  if (lead.estagio === parsedEstagio.data) {
    return { ok: true };
  }
  // Se já tá em ganho/perdido, precisa reabrir antes (via reabrirLead).
  if (lead.estagio === "ganho" || lead.estagio === "perdido") {
    return {
      error:
        "Lead já foi finalizado. Reabra antes de mover pra outro estágio.",
    };
  }

  await prisma.lead.update({
    where: { id },
    data: {
      estagio: parsedEstagio.data,
      etapaDesde: new Date(),
    },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "mudanca_estagio",
    descricao: `moveu o lead: ${descricaoEstagioLead(lead.estagio)} → ${descricaoEstagioLead(parsedEstagio.data)}`,
    metadata: { de: lead.estagio, para: parsedEstagio.data },
  });
  revalidate(id);
  return { ok: true };
}

interface GanharLeadOk {
  ok: true;
  clienteId: string;
  jaExistia: boolean;
}
interface GanharLeadDuplicado {
  ok: false;
  duplicate: true;
  clienteIdExistente: string;
  clienteRazaoSocial: string;
}
interface GanharLeadErr {
  error: string;
}
type GanharLeadResult = GanharLeadOk | GanharLeadDuplicado | GanharLeadErr;

const ganharLeadSchema = z.object({
  clienteIdExistente: z.string().min(1).optional(),
  confirmarDuplicado: z.boolean().optional(),
});

export type GanharLeadInput = z.input<typeof ganharLeadSchema>;

/**
 * Marca lead como ganho. Cria Cliente novo OU vincula a um Cliente
 * existente. Quando há colisão por CNPJ e nem `clienteIdExistente` nem
 * `confirmarDuplicado` foram informados, retorna `duplicate: true` pro UI
 * confirmar com o usuário (vincular ao existente vs criar novo mesmo assim).
 */
export async function ganharLead(
  id: string,
  input: GanharLeadInput = {},
): Promise<GanharLeadResult> {
  const parsed = ganharLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }
  if (lead.estagio === "ganho") {
    if (lead.clienteId) {
      return { ok: true, clienteId: lead.clienteId, jaExistia: true };
    }
    return { error: "Lead já está marcado como ganho mas sem cliente." };
  }

  let clienteId: string;
  let jaExistia = false;

  if (parsed.data.clienteIdExistente) {
    // Vincula ao cliente já escolhido pelo usuário no diálogo
    const cli = await prisma.cliente.findUnique({
      where: { id: parsed.data.clienteIdExistente },
      select: { id: true, ativo: true },
    });
    if (!cli) return { error: "Cliente selecionado não existe" };
    if (!cli.ativo) {
      return { error: "Cliente selecionado está arquivado" };
    }
    clienteId = cli.id;
    jaExistia = true;
  } else {
    // Pode haver duplicado por CNPJ — checa antes
    if (lead.cnpj && !parsed.data.confirmarDuplicado) {
      const existente = await prisma.cliente.findUnique({
        where: { cnpj: lead.cnpj },
        select: { id: true, razaoSocial: true },
      });
      if (existente) {
        return {
          ok: false,
          duplicate: true,
          clienteIdExistente: existente.id,
          clienteRazaoSocial: existente.razaoSocial,
        };
      }
    }

    // Cria Cliente reusando dados do lead
    try {
      const novo = await prisma.cliente.create({
        data: {
          razaoSocial: lead.razaoSocial,
          nomeFantasia: lead.nomeFantasia,
          cnpj: lead.cnpj,
          contatoResponsavel: lead.contatoNome,
          emailPrincipal: lead.email,
          telefone: lead.telefone,
          segmento: lead.segmento,
          obs: lead.obs,
          ativo: true,
        },
        select: { id: true },
      });
      clienteId = novo.id;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return {
          error:
            "Já existe um cliente com este CNPJ. Recarregue e tente novamente.",
        };
      }
      return { error: genericError(err, "Erro ao criar cliente") };
    }
  }

  await prisma.lead.update({
    where: { id },
    data: {
      estagio: "ganho",
      etapaDesde: new Date(),
      dataGanho: new Date(),
      clienteId,
      arquivado: false,
    },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "lead_ganho",
    descricao: jaExistia
      ? `marcou o lead como ganho (vinculado a cliente existente)`
      : `marcou o lead como ganho (cliente novo criado)`,
    metadata: { clienteId, jaExistia },
  });
  revalidate(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true, clienteId, jaExistia };
}

const perderLeadSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(2, "Informe um motivo")
    .max(2000),
});

export type PerderLeadInput = z.input<typeof perderLeadSchema>;

export async function perderLead(
  id: string,
  input: PerderLeadInput,
): Promise<ActionResult> {
  const parsed = perderLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true, estagio: true, razaoSocial: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.lead.update({
    where: { id },
    data: {
      estagio: "perdido",
      etapaDesde: new Date(),
      dataPerda: new Date(),
      motivoPerda: parsed.data.motivo,
      arquivado: false,
    },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "lead_perdido",
    descricao: `marcou o lead como perdido: ${parsed.data.motivo}`,
    metadata: { motivo: parsed.data.motivo },
  });
  revalidate(id);
  return { ok: true };
}

/**
 * Reabre um lead ganho/perdido pra um estágio ativo. Util quando alguém
 * marca por engano. Apaga `dataGanho`/`dataPerda` mas mantém `clienteId`
 * pra o histórico (ele pode ter virado cliente — não desfazemos isso aqui).
 */
export async function reabrirParaEstagio(
  id: string,
  estagioDestino: string,
): Promise<ActionResult> {
  const parsedEstagio = estagioMoveSchema.safeParse(estagioDestino);
  if (!parsedEstagio.success) {
    return { error: "Estágio inválido" };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, responsavelId: true, estagio: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.lead.update({
    where: { id },
    data: {
      estagio: parsedEstagio.data,
      etapaDesde: new Date(),
      dataGanho: null,
      dataPerda: null,
      motivoPerda: null,
    },
  });
  await logLeadActivity({
    leadId: id,
    autorId: session.user.id,
    tipo: "mudanca_estagio",
    descricao: `reabriu o lead em ${descricaoEstagioLead(parsedEstagio.data)}`,
    metadata: { de: lead.estagio, para: parsedEstagio.data, reabertura: true },
  });
  revalidate(id);
  return { ok: true };
}

// === Atividades + Follow-ups ===

const tipoAtividadeManualSchema = z.enum([
  "ligacao",
  "email",
  "reuniao",
  "whatsapp",
  "nota",
]);

const registrarAtividadeSchema = z.object({
  tipo: tipoAtividadeManualSchema,
  descricao: z.string().trim().min(2, "Descrição obrigatória").max(5000),
  /** Opcionalmente, agendar próximo follow-up no mesmo gesto */
  proximoFollowup: z
    .object({
      agendadoPara: z.coerce.date(),
      descricao: z.string().trim().min(2).max(2000),
    })
    .nullable()
    .optional(),
});

export type RegistrarAtividadeInput = z.input<typeof registrarAtividadeSchema>;

export async function registrarAtividade(
  leadId: string,
  data: RegistrarAtividadeInput,
): Promise<ActionResult> {
  const parsed = registrarAtividadeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, responsavelId: true, razaoSocial: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.atividadeLead.create({
    data: {
      leadId: lead.id,
      autorId: session.user.id,
      tipo: parsed.data.tipo,
      descricao: parsed.data.descricao,
    },
  });

  // Atualiza updatedAt do lead (pra ele subir nas listas ordenadas)
  await prisma.lead.update({
    where: { id: lead.id },
    data: { updatedAt: new Date() },
  });

  // Se o usuário pediu pra agendar próximo follow-up junto, cria também
  if (parsed.data.proximoFollowup) {
    await prisma.atividadeLead.create({
      data: {
        leadId: lead.id,
        autorId: session.user.id,
        tipo: "followup_agendado",
        descricao: parsed.data.proximoFollowup.descricao,
        agendadoPara: parsed.data.proximoFollowup.agendadoPara,
      },
    });
  }

  revalidate(leadId);
  return { ok: true };
}

const agendarFollowupSchema = z.object({
  agendadoPara: z.coerce.date(),
  descricao: z.string().trim().min(2, "Descrição obrigatória").max(2000),
});

export type AgendarFollowupInput = z.input<typeof agendarFollowupSchema>;

export async function agendarFollowup(
  leadId: string,
  data: AgendarFollowupInput,
): Promise<ActionResult> {
  const parsed = agendarFollowupSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, responsavelId: true },
  });
  if (!lead) return { error: "Lead não encontrado" };
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }

  await prisma.atividadeLead.create({
    data: {
      leadId: lead.id,
      autorId: session.user.id,
      tipo: "followup_agendado",
      descricao: parsed.data.descricao,
      agendadoPara: parsed.data.agendadoPara,
    },
  });
  revalidate(leadId);
  return { ok: true };
}

export async function marcarFollowupConcluido(
  atividadeId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const atividade = await prisma.atividadeLead.findUnique({
    where: { id: atividadeId },
    select: {
      id: true,
      leadId: true,
      tipo: true,
      concluidoEm: true,
      lead: { select: { responsavelId: true } },
    },
  });
  if (!atividade) return { error: "Atividade não encontrada" };
  if (atividade.tipo !== "followup_agendado") {
    return { error: "Apenas follow-ups agendados podem ser concluídos" };
  }
  if (
    !podeAgirSobreLead({
      role: session.user.role,
      userId: session.user.id,
      responsavelId: atividade.lead.responsavelId,
    })
  ) {
    return { error: "Sem permissão neste lead" };
  }
  if (atividade.concluidoEm) {
    return { ok: true };
  }

  await prisma.atividadeLead.update({
    where: { id: atividadeId },
    data: { concluidoEm: new Date() },
  });
  revalidate(atividade.leadId);
  return { ok: true };
}

export async function excluirAtividade(
  atividadeId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const atividade = await prisma.atividadeLead.findUnique({
    where: { id: atividadeId },
    select: {
      id: true,
      leadId: true,
      autorId: true,
      tipo: true,
      lead: { select: { responsavelId: true } },
    },
  });
  if (!atividade) return { error: "Atividade não encontrada" };

  // Só o autor da atividade ou admin pode excluir.
  // Eventos automáticos (mudanca_estagio, lead_ganho, etc) não podem ser
  // apagados — são auditoria.
  const tiposAutomaticos = new Set([
    "mudanca_estagio",
    "lead_ganho",
    "lead_perdido",
    "lead_arquivado",
    "lead_atribuido",
    "lead_capturado_site",
  ]);
  if (tiposAutomaticos.has(atividade.tipo)) {
    return { error: "Eventos automáticos não podem ser apagados" };
  }
  if (
    session.user.role !== "admin" &&
    atividade.autorId !== session.user.id
  ) {
    return { error: "Sem permissão" };
  }

  await prisma.atividadeLead.delete({ where: { id: atividadeId } });
  revalidate(atividade.leadId);
  return { ok: true };
}
