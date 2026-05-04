import type { Prisma, TipoAtividadeLead } from "@prisma/client";
import { prisma } from "./prisma";

interface LogLeadActivityArgs {
  leadId: string;
  autorId: string;
  tipo: TipoAtividadeLead;
  descricao: string;
  metadata?: Prisma.InputJsonValue;
  agendadoPara?: Date | null;
  concluidoEm?: Date | null;
}

/**
 * Registra um evento na timeline do Lead. Análogo a `logActivity()` do módulo
 * de vagas, mas trabalha com `AtividadeLead`. Falhas são logadas mas não
 * propagam — o evento principal não pode quebrar por causa do log.
 */
export async function logLeadActivity(args: LogLeadActivityArgs): Promise<void> {
  try {
    await prisma.atividadeLead.create({
      data: {
        leadId: args.leadId,
        autorId: args.autorId,
        tipo: args.tipo,
        descricao: args.descricao,
        metadata: args.metadata,
        agendadoPara: args.agendadoPara ?? null,
        concluidoEm: args.concluidoEm ?? null,
      },
    });
  } catch (err) {
    console.error("[lead activity] falhou ao registrar atividade", err);
  }
}

export function descricaoEstagioLead(estagio: string): string {
  const map: Record<string, string> = {
    novo: "Novo",
    qualificado: "Qualificado",
    proposta: "Proposta enviada",
    negociacao: "Em negociação",
    ganho: "Ganho",
    perdido: "Perdido",
  };
  return map[estagio] ?? estagio;
}

export function descricaoOrigemLead(origem: string): string {
  const map: Record<string, string> = {
    prospeccao_ativa: "Prospecção ativa",
    indicacao: "Indicação",
    site: "Site",
    redes_sociais: "Redes sociais",
    linkedin: "LinkedIn",
    evento: "Evento",
    whatsapp: "WhatsApp",
    outro: "Outro",
  };
  return map[origem] ?? origem;
}
