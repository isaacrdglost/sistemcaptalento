import { Fluxo, Vaga } from "@prisma/client";
import {
  addBusinessDays,
  diffBusinessDays,
  formatDateBR,
  startOfDay,
} from "./business-days";

export type MarcoKey =
  | "briefing"
  | "publicacao"
  | "triagem"
  | "entrevistas"
  | "shortlistInterna"
  | "entregaCliente"
  | "retornoCliente"
  | "fechamento";

export type MarcoStatus = "pending" | "current" | "done" | "late";

export interface MarcoSpec {
  key: MarcoKey;
  label: string;
  offsetDays: number; // dias úteis contados a partir de dataPublicacao
  description: string;
}

export const FLUXO_PADRAO: MarcoSpec[] = [
  { key: "briefing", label: "Briefing", offsetDays: -1, description: "Briefing com cliente registrado" },
  { key: "publicacao", label: "Publicação", offsetDays: 0, description: "Vaga publicada — início do processo" },
  { key: "triagem", label: "Triagem", offsetDays: 5, description: "Triagem de currículos concluída" },
  { key: "entrevistas", label: "Entrevistas", offsetDays: 10, description: "Entrevistas concluídas" },
  { key: "shortlistInterna", label: "Shortlist interna", offsetDays: 18, description: "Shortlist validada internamente" },
  { key: "entregaCliente", label: "Entrega ao cliente", offsetDays: 20, description: "Shortlist entregue ao cliente" },
  { key: "retornoCliente", label: "Retorno do cliente", offsetDays: 25, description: "Cliente deu retorno sobre a shortlist" },
  { key: "fechamento", label: "Fechamento", offsetDays: 30, description: "Processo encerrado" },
];

export const FLUXO_RAPIDO: MarcoSpec[] = [
  { key: "briefing", label: "Briefing", offsetDays: -1, description: "Briefing com cliente registrado" },
  { key: "publicacao", label: "Publicação", offsetDays: 0, description: "Vaga publicada — início do processo" },
  { key: "triagem", label: "Triagem", offsetDays: 3, description: "Triagem de currículos concluída" },
  { key: "entrevistas", label: "Entrevistas", offsetDays: 7, description: "Entrevistas concluídas" },
  { key: "shortlistInterna", label: "Shortlist interna", offsetDays: 12, description: "Shortlist validada internamente" },
  { key: "entregaCliente", label: "Entrega ao cliente", offsetDays: 14, description: "Shortlist entregue ao cliente" },
  { key: "retornoCliente", label: "Retorno do cliente", offsetDays: 18, description: "Cliente deu retorno sobre a shortlist" },
  { key: "fechamento", label: "Fechamento", offsetDays: 21, description: "Processo encerrado" },
];

export function getFluxoSpec(fluxo: Fluxo): MarcoSpec[] {
  return fluxo === "rapido" ? FLUXO_RAPIDO : FLUXO_PADRAO;
}

export function fluxoTotalDays(fluxo: Fluxo): number {
  return fluxo === "rapido" ? 21 : 30;
}

export function fluxoLabel(fluxo: Fluxo): string {
  return fluxo === "rapido" ? "Rápido" : "Padrão";
}

export interface MarcoComputed extends MarcoSpec {
  /** data calculada (pode ser nula se vaga ainda não publicada e marco depende da publicação) */
  dataPrevista: Date | null;
  /** data real (preenchida quando o marco foi confirmado) */
  dataRealizada: Date | null;
  status: MarcoStatus;
  /** dias úteis restantes — negativo significa atrasado */
  diasRestantes: number | null;
}

export interface VagaWithDerived {
  fase: 1 | 2; // 1 = pré-publicação, 2 = ativa
  marcos: MarcoComputed[];
  prazoFinal: Date | null;
  diasRestantesPrazo: number | null;
  progressoPct: number;
  /** true quando hoje já passou do prazo final e a vaga não foi encerrada */
  estaAtrasada: boolean;
  alertas: VagaAlerta[];
  proximosMarcos: MarcoComputed[];
}

export type AlertaNivel = "warning" | "danger";

export interface VagaAlerta {
  nivel: AlertaNivel;
  titulo: string;
  descricao: string;
}

function getRealizadoDate(vaga: Vaga, key: MarcoKey): Date | null {
  switch (key) {
    case "briefing":
      return vaga.dataBriefing ?? null;
    case "publicacao":
      return vaga.dataPublicacao ?? null;
    case "triagem":
      return vaga.dataTriagemConfirmada ?? null;
    case "entrevistas":
      return vaga.dataEntrevistasConfirmada ?? null;
    case "shortlistInterna":
      return vaga.dataShortlistInterna ?? null;
    case "entregaCliente":
      return vaga.shortlistEntregue ? vaga.dataShortlistEntregue ?? null : null;
    case "retornoCliente":
      return vaga.dataUltimoContatoCliente ?? null;
    case "fechamento":
      return vaga.encerrada ? vaga.dataEncerramento ?? null : null;
  }
}

export function computeVagaDerived(vaga: Vaga, now: Date = new Date()): VagaWithDerived {
  const specs = getFluxoSpec(vaga.fluxo);
  const pub = vaga.dataPublicacao ? startOfDay(vaga.dataPublicacao) : null;
  const today = startOfDay(now);
  const fase: 1 | 2 = pub ? 2 : 1;

  const prazoManual = vaga.dataPrazo ? startOfDay(vaga.dataPrazo) : null;

  // Quando o admin define um prazo manual diferente do fluxo, escalonamos
  // TODOS os marcos intermediários proporcionalmente para caberem no novo
  // prazo. Assim evitamos situações absurdas (ex.: "retorno do cliente"
  // previsto DEPOIS do "fechamento"). O briefing e a publicação não entram
  // na conta — são âncoras de início.
  const fluxoTotal = fluxoTotalDays(vaga.fluxo);
  let prazoOffsetUteis: number | null = null;
  if (pub && prazoManual) {
    prazoOffsetUteis = diffBusinessDays(pub, prazoManual);
  }
  const escalar =
    prazoOffsetUteis !== null &&
    prazoOffsetUteis > 0 &&
    prazoOffsetUteis !== fluxoTotal;
  const escala = escalar ? prazoOffsetUteis! / fluxoTotal : 1;

  const marcos: MarcoComputed[] = specs.map((spec) => {
    // briefing é calculado a partir de dataBriefing
    let dataPrevista: Date | null = null;
    if (spec.key === "briefing") {
      dataPrevista = vaga.dataBriefing ? startOfDay(vaga.dataBriefing) : null;
    } else if (pub) {
      let effectiveOffset = spec.offsetDays;
      if (spec.key === "fechamento" && prazoOffsetUteis !== null) {
        // Fechamento cola exatamente no prazo manual.
        effectiveOffset = prazoOffsetUteis;
      } else if (escalar && spec.offsetDays > 0) {
        // Marcos intermediários (triagem, entrevistas, shortlist, etc.) são
        // reescalados. Math.max(1, …) preserva ordem mesmo em prazos curtos.
        effectiveOffset = Math.max(1, Math.round(spec.offsetDays * escala));
      }
      dataPrevista = addBusinessDays(pub, effectiveOffset);
    }

    const dataRealizada = getRealizadoDate(vaga, spec.key);

    let status: MarcoStatus;
    if (dataRealizada) {
      status = "done";
    } else if (!dataPrevista) {
      status = "pending";
    } else if (today > dataPrevista) {
      status = "late";
    } else if (today.getTime() === dataPrevista.getTime()) {
      status = "current";
    } else {
      status = "pending";
    }

    const diasRestantes = dataPrevista ? diffBusinessDays(today, dataPrevista) : null;

    return {
      ...spec,
      dataPrevista,
      dataRealizada,
      status,
      diasRestantes,
    };
  });

  // prazo final: marco "fechamento" (que já incorpora override manual acima)
  const prazoFinal = marcos.find((m) => m.key === "fechamento")?.dataPrevista ?? null;
  const diasRestantesPrazo = prazoFinal ? diffBusinessDays(today, prazoFinal) : null;

  // progresso: dias úteis decorridos desde publicação / total efetivo do fluxo
  // (considera prazo manual, se houver)
  let progressoPct = 0;
  if (vaga.encerrada) {
    progressoPct = 100;
  } else if (pub) {
    const decorridos = Math.max(0, diffBusinessDays(pub, today));
    const total =
      prazoOffsetUteis && prazoOffsetUteis > 0
        ? prazoOffsetUteis
        : fluxoTotal;
    progressoPct = Math.min(100, Math.round((decorridos / total) * 100));
  }

  const estaAtrasada =
    !vaga.encerrada &&
    diasRestantesPrazo !== null &&
    diasRestantesPrazo < 0;
  const alertas = computeAlertas(vaga, marcos, today);
  const proximosMarcos = vaga.encerrada ? [] : pickProximosMarcos(marcos);

  return {
    fase,
    marcos,
    prazoFinal,
    diasRestantesPrazo,
    progressoPct,
    estaAtrasada,
    alertas,
    proximosMarcos,
  };
}

function computeAlertas(
  vaga: Vaga,
  marcos: MarcoComputed[],
  today: Date,
): VagaAlerta[] {
  const alertas: VagaAlerta[] = [];
  if (vaga.encerrada) return alertas;

  if (!vaga.shortlistEntregue) {
    // Dispara se QUALQUER um dos marcos de shortlist (interna ou entrega) estiver atrasado.
    // Antes disparava apenas em shortlistInterna — se o recrutador registrava a interna
    // mas deixava a entrega atrasar, a vaga sangrava sem alerta.
    const shortlistInterna = marcos.find((m) => m.key === "shortlistInterna");
    const entregaCliente = marcos.find((m) => m.key === "entregaCliente");
    const marcoAtrasado =
      entregaCliente?.status === "late"
        ? entregaCliente
        : shortlistInterna?.status === "late"
          ? shortlistInterna
          : null;
    if (marcoAtrasado?.dataPrevista) {
      alertas.push({
        nivel: "danger",
        titulo: "Shortlist atrasada",
        descricao: `Marco "${marcoAtrasado.label}" venceu em ${formatDateBR(marcoAtrasado.dataPrevista)}`,
      });
    }
  }

  if (vaga.shortlistEntregue && vaga.dataShortlistEntregue) {
    if (vaga.dataUltimoContatoCliente) {
      const dias = diffBusinessDays(
        startOfDay(vaga.dataUltimoContatoCliente),
        today,
      );
      if (dias >= 2) {
        alertas.push({
          nivel: "warning",
          titulo: "Cliente sem retorno",
          descricao: `${dias} dias úteis desde o último contato com o cliente`,
        });
      }
    } else {
      const dias = diffBusinessDays(
        startOfDay(vaga.dataShortlistEntregue),
        today,
      );
      if (dias >= 2) {
        alertas.push({
          nivel: "warning",
          titulo: "Cliente sem retorno",
          descricao: `${dias} dias úteis desde a entrega da shortlist, sem contato registrado`,
        });
      }
    }
  }

  return alertas;
}

function pickProximosMarcos(marcos: MarcoComputed[]): MarcoComputed[] {
  // 3 marcos mais relevantes:
  // prioridade 1: atrasados não concluídos
  // prioridade 2: "current" (hoje)
  // prioridade 3: pendentes em ordem cronológica
  const nConcluidos = marcos.filter((m) => m.status !== "done");
  const atrasados = nConcluidos.filter((m) => m.status === "late");
  const current = nConcluidos.filter((m) => m.status === "current");
  const pendentes = nConcluidos
    .filter((m) => m.status === "pending")
    .sort((a, b) => {
      if (!a.dataPrevista && !b.dataPrevista) return 0;
      if (!a.dataPrevista) return 1;
      if (!b.dataPrevista) return -1;
      return a.dataPrevista.getTime() - b.dataPrevista.getTime();
    });

  return [...atrasados, ...current, ...pendentes].slice(0, 3);
}

export function prazoCor(dias: number | null): "verde" | "ambar" | "vermelho" | "neutro" {
  if (dias === null) return "neutro";
  if (dias < 5) return "vermelho";
  if (dias <= 10) return "ambar";
  return "verde";
}
