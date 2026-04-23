import type { Prisma, TipoAtividade } from "@prisma/client";
import { prisma } from "./prisma";

interface LogActivityArgs {
  vagaId: string;
  autorId: string;
  tipo: TipoAtividade;
  descricao: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Grava um evento de atividade. Nunca deve quebrar o fluxo principal de uma
 * action — logs que falham vão para o console mas não propagam erro.
 */
export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    await prisma.atividade.create({
      data: {
        vagaId: args.vagaId,
        autorId: args.autorId,
        tipo: args.tipo,
        descricao: args.descricao,
        metadata: args.metadata,
      },
    });
  } catch (err) {
    console.error("[activity log] falhou ao registrar atividade", err);
  }
}

export function descricaoStatusCandidato(
  status: string,
): string {
  const map: Record<string, string> = {
    triagem: "Triagem",
    entrevista: "Entrevista",
    shortlist: "Shortlist",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
  };
  return map[status] ?? status;
}
