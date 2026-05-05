import type { StatusContratacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DIAS_GARANTIA = 30;
export const DIAS_DEFAULT_ADMISSAO_APOS_SHORTLIST = 7;

/**
 * Sugere uma data de admissão default a partir da shortlist entregue.
 * Heurística: cliente costuma fechar contratação ~7 dias após receber
 * a shortlist. Quando não há shortlist registrada, retorna hoje.
 */
export function sugerirDataAdmissao(
  dataShortlistEntregue: Date | null | undefined,
): Date {
  if (!dataShortlistEntregue) return new Date();
  const d = new Date(dataShortlistEntregue);
  d.setDate(d.getDate() + DIAS_DEFAULT_ADMISSAO_APOS_SHORTLIST);
  return d;
}

/**
 * Calcula `dataFimGarantia` a partir da `dataAdmissao`.
 * 30 dias corridos (não úteis) — alinhado à proposta da CapTalento.
 */
export function calcularFimGarantia(dataAdmissao: Date): Date {
  const fim = new Date(dataAdmissao);
  fim.setDate(fim.getDate() + DIAS_GARANTIA);
  return fim;
}

/**
 * Dias corridos restantes na garantia. Pode ser negativo (já passou).
 */
export function diasRestantesGarantia(
  dataFimGarantia: Date,
  agora: Date = new Date(),
): number {
  const ms = dataFimGarantia.getTime() - agora.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Tom visual pra UI. Verde tranquilo até 14d, amarelo entre 7-14d, vermelho
 * nos últimos 7 dias, slate quando expirou ou não está em garantia.
 */
export function toneGarantia(
  status: StatusContratacao,
  dataFimGarantia: Date,
  agora: Date = new Date(),
): "lima" | "amber" | "red" | "slate" {
  if (status !== "em_garantia") return "slate";
  const dias = diasRestantesGarantia(dataFimGarantia, agora);
  if (dias <= 7) return "red";
  if (dias <= 14) return "amber";
  return "lima";
}

/**
 * Atualiza lazy: contratações `em_garantia` que já passaram do prazo viram
 * `garantia_ok`. Roda em load das páginas relevantes — sem cron novo.
 * Retorna número de registros atualizados (informacional).
 */
export async function aplicarVencimentosGarantia(
  agora: Date = new Date(),
): Promise<number> {
  const result = await prisma.contratacao.updateMany({
    where: {
      status: "em_garantia",
      dataFimGarantia: { lte: agora },
    },
    data: {
      status: "garantia_ok",
    },
  });
  return result.count;
}

/**
 * Label PT-BR pro status.
 */
export function descricaoStatusContratacao(status: StatusContratacao): string {
  switch (status) {
    case "em_garantia":
      return "Em garantia";
    case "garantia_ok":
      return "Garantia concluída";
    case "garantia_acionada":
      return "Garantia acionada";
    case "reposto":
      return "Reposto";
    case "encerrado":
      return "Encerrada";
  }
}

interface ResumoInput {
  status: StatusContratacao;
  dataFimGarantia: Date;
}

/**
 * Versão "data + status" combinada — útil em listas/cards.
 * Ex.: "Em garantia · 12 dias restantes" / "Garantia concluída".
 */
export function resumoStatusGarantia(
  c: ResumoInput,
  agora: Date = new Date(),
): string {
  if (c.status === "em_garantia") {
    const dias = diasRestantesGarantia(c.dataFimGarantia, agora);
    if (dias <= 0) return "Garantia vencendo agora";
    if (dias === 1) return "Em garantia · 1 dia restante";
    return `Em garantia · ${dias} dias restantes`;
  }
  if (c.status === "garantia_ok") return "Garantia concluída sem incidente";
  if (c.status === "garantia_acionada") return "Garantia acionada — em triagem";
  if (c.status === "reposto") return "Reposição concluída";
  return "Contratação encerrada";
}
