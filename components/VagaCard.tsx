import Link from "next/link";
import type { Vaga } from "@prisma/client";
import { computeVagaDerived, prazoCor } from "@/lib/flows";
import {
  formatDateBR,
  formatDateShortBR,
  formatDiasRestantes,
} from "@/lib/business-days";
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
  verde: "text-emerald-700 bg-emerald-50",
  ambar: "text-amber-700 bg-amber-50",
  vermelho: "text-red-700 bg-red-50",
  neutro: "text-slate-500 bg-slate-100",
};

const MARCO_DOT_BY_STATUS: Record<string, string> = {
  done: "bg-royal",
  current: "bg-royal ring-2 ring-royal-200",
  late: "bg-red-500",
  pending: "bg-slate-200",
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

  return (
    <Link
      href={`/vagas/${vaga.id}`}
      className="card block p-5 transition hover:shadow-card-hover"
    >
      <div className="flex flex-col gap-4">
        {alertas.length > 0 ? <AlertaVaga alertas={alertas} /> : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-ink">
              {vaga.titulo}
            </h3>
            <p className="truncate text-sm text-slate-500">{vaga.cliente}</p>
          </div>
          <FluxoBadge fluxo={vaga.fluxo} />
        </div>

        {showRecrutador ? (
          <p className="text-xs text-slate-500">
            Recrutadora: <span className="text-ink">{vaga.recrutador.nome}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {fase === 1 ? (
            <span className="badge-slate">Pré-publicação</span>
          ) : (
            <span className="badge-royal">Ativa</span>
          )}
          {vaga.encerrada ? (
            <span className="badge-green">Encerrada</span>
          ) : null}
        </div>

        <div className={`rounded-lg px-3 py-2 ${prazoClasse}`}>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Prazo final
          </div>
          <div className="flex items-baseline justify-between gap-3">
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

        <ProgressBar
          pct={progressoPct}
          label={`${progressoPct}% do fluxo`}
          atrasada={estaAtrasada}
        />

        <div className="flex items-center gap-2">
          {marcos.map((m) => {
            const dot = MARCO_DOT_BY_STATUS[m.status] ?? "bg-slate-200";
            const tooltip = `${m.label}${
              m.dataPrevista
                ? ` • ${formatDateShortBR(m.dataPrevista)}`
                : ""
            } • ${m.status}`;
            return (
              <span
                key={m.key}
                title={tooltip}
                className={`h-2.5 w-2.5 rounded-full ${dot}`}
              />
            );
          })}
        </div>

        {proximosMarcos.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {proximosMarcos.map((m) => (
              <li
                key={m.key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-ink">{m.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    {formatDateShortBR(m.dataPrevista)}
                  </span>
                  <span className={diasClasse(m.diasRestantes)}>
                    {formatDiasRestantes(m.diasRestantes)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            {vaga._count.candidatos}{" "}
            {vaga._count.candidatos === 1 ? "candidato" : "candidatos"}
          </span>
        </div>
      </div>
    </Link>
  );
}
