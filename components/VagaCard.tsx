import Link from "next/link";
import type { Vaga } from "@prisma/client";
import { CalendarClock, ChevronRight, Users } from "lucide-react";
import { computeVagaDerived, prazoCor } from "@/lib/flows";
import {
  formatDateBR,
  formatDateShortBR,
  formatDiasRestantes,
} from "@/lib/business-days";
import { Avatar } from "@/components/ui/Avatar";
import { FluxoBadge } from "./FluxoBadge";
import { ProgressBar } from "./ProgressBar";
import { AlertaVaga } from "./AlertaVaga";

export type VagaWithRecrutador = Vaga & {
  recrutador: { id: string; nome: string };
  _count: { candidatos: number };
};

interface VagaCardProps {
  vaga: VagaWithRecrutador;
  showRecrutador?: boolean;
}

const PRAZO_CLASSES: Record<
  "verde" | "ambar" | "vermelho" | "neutro",
  string
> = {
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ambar: "bg-amber-50 text-amber-700 ring-amber-100",
  vermelho: "bg-red-50 text-red-700 ring-red-100",
  neutro: "bg-slate-50 text-slate-600 ring-slate-200",
};

const MARCO_DOT_BY_STATUS: Record<string, string> = {
  done: "bg-royal",
  current: "bg-royal ring-2 ring-royal-200",
  late: "bg-red-500",
  pending: "bg-slate-200",
};

const MARCO_BULLET_BY_STATUS: Record<string, string> = {
  done: "bg-royal",
  current: "bg-royal ring-2 ring-royal-200",
  late: "bg-red-500",
  pending: "bg-slate-300",
};

const MARCO_INITIAL: Record<string, string> = {
  briefing: "B",
  publicacao: "P",
  triagem: "T",
  entrevistas: "E",
  shortlistInterna: "SI",
  entregaCliente: "EC",
  retornoCliente: "RC",
  fechamento: "F",
};

function diasClasse(dias: number | null): string {
  const cor = prazoCor(dias);
  switch (cor) {
    case "verde":
      return "text-emerald-700";
    case "ambar":
      return "text-amber-700";
    case "vermelho":
      return "text-red-700";
    default:
      return "text-slate-500";
  }
}

export function VagaCard({ vaga, showRecrutador = false }: VagaCardProps) {
  const derived = computeVagaDerived(vaga);
  const {
    fase,
    marcos,
    prazoFinal,
    diasRestantesPrazo,
    progressoPct,
    estaAtrasada,
    alertas,
    proximosMarcos,
  } = derived;

  const prazoClasse = PRAZO_CLASSES[prazoCor(diasRestantesPrazo)];
  const totalCandidatos = vaga._count.candidatos;

  return (
    <Link
      href={`/vagas/${vaga.id}`}
      className="card-interactive group relative block p-5"
    >
      <div className="flex flex-col gap-4">
        {/* Topo: cliente + fluxo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar nome={vaga.cliente} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">
                {vaga.cliente}
              </p>
              <h3 className="truncate text-h3 text-ink">{vaga.titulo}</h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FluxoBadge fluxo={vaga.fluxo} />
            <ChevronRight
              size={16}
              className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
            />
          </div>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {fase === 1 ? (
            <span className="badge-slate">Pré-publicação</span>
          ) : (
            <span className="badge-royal">Ativa</span>
          )}
          {vaga.encerrada ? (
            <span className="badge-green">Encerrada</span>
          ) : null}
          {alertas.length > 0 && !vaga.encerrada ? (
            <span className="badge-red">
              {alertas.length === 1
                ? "1 alerta"
                : `${alertas.length} alertas`}
            </span>
          ) : null}
        </div>

        {/* Alertas detalhados (quando houver) */}
        {alertas.length > 0 ? <AlertaVaga alertas={alertas} /> : null}

        {/* Bloco de prazo */}
        <div
          className={`rounded-xl px-3 py-2.5 ring-1 ring-inset ${prazoClasse}`}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
            <CalendarClock size={12} />
            Prazo final
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">
              {formatDateBR(prazoFinal)}
            </span>
            <span className="text-xs font-medium">
              {vaga.encerrada
                ? "encerrada"
                : formatDiasRestantes(diasRestantesPrazo)}
            </span>
          </div>
        </div>

        {/* Progresso */}
        <ProgressBar
          pct={progressoPct}
          label={`${progressoPct}% do fluxo`}
          atrasada={estaAtrasada}
        />

        {/* Mini timeline: dot + letra inicial */}
        <div className="flex items-start justify-between gap-1">
          {marcos.map((m) => {
            const dot = MARCO_DOT_BY_STATUS[m.status] ?? "bg-slate-200";
            const tooltip = `${m.label}${
              m.dataPrevista ? ` • ${formatDateShortBR(m.dataPrevista)}` : ""
            } • ${m.status}`;
            const initial = MARCO_INITIAL[m.key] ?? "?";
            return (
              <div
                key={m.key}
                title={tooltip}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  {initial}
                </span>
              </div>
            );
          })}
        </div>

        {/* Próximos marcos com bolinha do status */}
        {proximosMarcos.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {proximosMarcos.map((m) => {
              const bullet =
                MARCO_BULLET_BY_STATUS[m.status] ?? "bg-slate-300";
              return (
                <li
                  key={m.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${bullet}`}
                    />
                    <span className="truncate text-ink">{m.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-slate-500">
                      {formatDateShortBR(m.dataPrevista)}
                    </span>
                    <span className={diasClasse(m.diasRestantes)}>
                      {formatDiasRestantes(m.diasRestantes, { short: true })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Footer: recrutadora + candidatos */}
        <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3 text-xs">
          {showRecrutador ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar nome={vaga.recrutador.nome} size="xs" />
              <span className="truncate text-slate-600">
                {vaga.recrutador.nome}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
            <Users size={14} />
            <span className="font-medium text-ink">{totalCandidatos}</span>
            <span>{totalCandidatos === 1 ? "candidato" : "candidatos"}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
