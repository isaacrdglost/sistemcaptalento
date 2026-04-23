import type { VagaWithRecrutador } from "@/components/VagaCard";
import { computeVagaDerived } from "@/lib/flows";
import { diffBusinessDays, startOfDay } from "@/lib/business-days";

export interface TopRecrutador {
  id: string;
  nome: string;
  count: number;
}

export interface ActivityBucket {
  /** data no início do dia (local) */
  date: Date;
  /** rótulo curto ex.: "22/04" */
  label: string;
  /** contagem absoluta de vagas criadas no dia */
  count: number;
}

export interface AdminMetricsData {
  ativas: number;
  criadasUltimos30d: number;
  emAtraso: number;
  shortlistsMes: number;
  tempoMedioShortlistDiasUteis: number | null;
  buckets30d: ActivityBucket[];
  maxBucket: number;
  topRecrutadores: TopRecrutador[];
}

/**
 * Calcula todas as métricas agregadas do painel admin a partir da lista de vagas.
 * Função pura — recebe `now` para facilitar testes determinísticos.
 */
export function computeAdminMetrics(
  vagas: VagaWithRecrutador[],
  now: Date = new Date(),
): AdminMetricsData {
  const today = startOfDay(now);
  const inicioMes = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  // 30 dias atrás (inclusive hoje como último bucket).
  const inicio30d = new Date(today);
  inicio30d.setDate(inicio30d.getDate() - 29);

  const ativasList = vagas.filter((v) => !v.encerrada);

  let emAtraso = 0;
  for (const v of vagas) {
    if (v.encerrada) continue;
    const d = computeVagaDerived(v, now);
    const tem =
      d.alertas.length > 0 ||
      (d.diasRestantesPrazo !== null && d.diasRestantesPrazo < 0);
    if (tem) emAtraso++;
  }

  const shortlistsMes = vagas.filter(
    (v) =>
      v.shortlistEntregue &&
      v.dataShortlistEntregue !== null &&
      v.dataShortlistEntregue !== undefined &&
      new Date(v.dataShortlistEntregue).getTime() >= inicioMes.getTime(),
  ).length;

  // Tempo médio até shortlist (dias úteis).
  const deltas: number[] = [];
  for (const v of vagas) {
    if (
      v.shortlistEntregue &&
      v.dataShortlistEntregue &&
      v.dataPublicacao
    ) {
      const delta = diffBusinessDays(
        startOfDay(v.dataPublicacao),
        startOfDay(v.dataShortlistEntregue),
      );
      if (delta >= 0) deltas.push(delta);
    }
  }
  const tempoMedioShortlistDiasUteis =
    deltas.length === 0
      ? null
      : Math.round(
          (deltas.reduce((acc, x) => acc + x, 0) / deltas.length) * 10,
        ) / 10;

  // Buckets: 30 dias (inclusive hoje). Sempre 30 elementos, mesmo vazios.
  const buckets30d: ActivityBucket[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio30d);
    d.setDate(d.getDate() + i);
    buckets30d.push({
      date: d,
      label: d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      count: 0,
    });
  }

  for (const v of vagas) {
    const created = startOfDay(new Date(v.createdAt));
    if (created.getTime() < inicio30d.getTime()) continue;
    if (created.getTime() > today.getTime()) continue;
    const idx = Math.round(
      (created.getTime() - inicio30d.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (idx >= 0 && idx < buckets30d.length) {
      buckets30d[idx].count++;
    }
  }

  const criadasUltimos30d = buckets30d.reduce((acc, b) => acc + b.count, 0);
  const maxBucket = buckets30d.reduce(
    (acc, b) => (b.count > acc ? b.count : acc),
    0,
  );

  // Top recrutadoras por vagas ativas.
  const mapaRec = new Map<string, TopRecrutador>();
  for (const v of ativasList) {
    const id = v.recrutador?.id ?? "—";
    const nome = v.recrutador?.nome ?? "—";
    const atual = mapaRec.get(id);
    if (atual) {
      atual.count++;
    } else {
      mapaRec.set(id, { id, nome, count: 1 });
    }
  }
  const topRecrutadores = Array.from(mapaRec.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    ativas: ativasList.length,
    criadasUltimos30d,
    emAtraso,
    shortlistsMes,
    tempoMedioShortlistDiasUteis,
    buckets30d,
    maxBucket,
    topRecrutadores,
  };
}
