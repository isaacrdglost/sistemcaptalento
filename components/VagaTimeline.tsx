"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Lock } from "lucide-react";
import type { Vaga } from "@prisma/client";
import { formatDateBR, formatDiasRestantes } from "@/lib/business-days";
import { prazoCor } from "@/lib/flows";
import type { MarcoComputed, VagaWithDerived } from "@/lib/flows";
import {
  confirmarEntrevistas,
  confirmarShortlistInterna,
  confirmarTriagem,
  desfazerMarco,
  marcarShortlistEntregue,
  publicarVaga,
  registrarContatoCliente,
} from "@/app/vagas/[id]/actions";

interface VagaTimelineProps {
  vaga: Vaga;
  derived: VagaWithDerived;
  canEdit: boolean;
}

const DOT_BY_STATUS: Record<MarcoComputed["status"], string> = {
  done: "bg-lima-500 border-lima-500 text-white",
  current: "bg-royal border-royal text-white",
  late: "bg-red-600 border-red-600 text-white",
  pending: "bg-white border-line-strong text-slate-400",
};

const CARD_BY_STATUS: Record<MarcoComputed["status"], string> = {
  done: "bg-slate-50/40 border-line/70 opacity-75",
  current:
    "bg-white border-royal/40 ring-1 ring-royal-100 shadow-glow",
  late: "bg-white border-l-2 border-l-red-300 border-line/70",
  pending: "bg-white border-line/70",
};

const STATUS_CHIP: Record<
  MarcoComputed["status"],
  { label: string; className: string }
> = {
  done: {
    label: "Concluído",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  },
  current: {
    label: "Hoje",
    className: "bg-royal-50 text-royal-700 ring-1 ring-inset ring-royal-100",
  },
  late: {
    label: "Atrasado",
    className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100",
  },
  pending: {
    label: "Próximo",
    className: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  },
};

const PRAZO_TEXT: Record<
  "verde" | "ambar" | "vermelho" | "neutro",
  string
> = {
  verde: "text-emerald-700",
  ambar: "text-amber-700",
  vermelho: "text-red-700",
  neutro: "text-slate-500",
};

function diasRestantesTexto(marco: MarcoComputed): {
  label: string;
  className: string;
} | null {
  if (marco.status === "done") return null;
  if (marco.diasRestantes === null) return null;
  return {
    label: formatDiasRestantes(marco.diasRestantes),
    className: PRAZO_TEXT[prazoCor(marco.diasRestantes)],
  };
}

export function VagaTimeline({ vaga, derived, canEdit }: VagaTimelineProps) {
  const [isPending, startTransition] = useTransition();

  const run = (
    fn: () => Promise<{ ok: true } | { error: string }>,
    successMsg?: string,
  ) => {
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) {
        toast.error(result.error);
      } else if (successMsg) {
        toast.success(successMsg);
      }
    });
  };

  const savingLabel = (label: string) => (isPending ? "Salvando…" : label);

  return (
    <section className="card p-6">
      {vaga.encerrada && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-line/70 bg-slate-50/80 px-4 py-3">
          <Lock size={16} className="mt-0.5 shrink-0 text-slate-500" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink">Vaga encerrada</p>
            <p className="text-slate-500">
              {vaga.dataEncerramento
                ? `Encerrada em ${formatDateBR(vaga.dataEncerramento)}. Marcos pendentes não disparam mais alertas.`
                : "Marcos pendentes não disparam mais alertas."}
            </p>
          </div>
        </div>
      )}

      <ol className="relative flex flex-col gap-3">
        {derived.marcos.map((marco, idx) => {
          const isLast = idx === derived.marcos.length - 1;
          const dotClass = DOT_BY_STATUS[marco.status];
          const cardClass = CARD_BY_STATUS[marco.status];
          const chip = STATUS_CHIP[marco.status];
          const dias = diasRestantesTexto(marco);
          const prevText =
            marco.status === "late"
              ? "Venceu em"
              : marco.dataRealizada
                ? "Previsto:"
                : "Previsto para";

          return (
            <li
              key={marco.key}
              className="relative flex gap-4 animate-fade-in-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* linha vertical conectora */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 bottom-[-12px] w-px bg-line"
                />
              )}

              {/* bolinha */}
              <span
                aria-hidden
                className={`relative z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${dotClass} ${
                  marco.status === "current" ? "animate-pulse-soft" : ""
                }`}
              >
                {marco.status === "done" && <Check size={14} strokeWidth={3} />}
                {marco.status === "current" && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
                {marco.status === "late" && (
                  <span className="text-[11px] font-bold leading-none">!</span>
                )}
              </span>

              {/* card */}
              <div
                className={`flex-1 min-w-0 rounded-xl border p-4 transition-shadow ${cardClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink leading-tight">
                    {marco.label}
                  </h3>
                  <span
                    className={`badge ${chip.className} shrink-0`}
                  >
                    {chip.label}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {marco.dataPrevista
                    ? `${prevText} ${formatDateBR(marco.dataPrevista)}`
                    : "Aguardando publicação"}
                  {dias && (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className={`font-medium ${dias.className}`}>
                        {dias.label}
                      </span>
                    </>
                  )}
                </p>

                {marco.description && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {marco.description}
                  </p>
                )}

                {marco.dataRealizada && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-lima-700">
                    <Check size={12} strokeWidth={3} />
                    Confirmado em {formatDateBR(marco.dataRealizada)}
                  </p>
                )}

                {canEdit && (
                  <MarcoActions
                    vaga={vaga}
                    marco={marco}
                    isPending={isPending}
                    savingLabel={savingLabel}
                    run={run}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface MarcoActionsProps {
  vaga: Vaga;
  marco: MarcoComputed;
  isPending: boolean;
  savingLabel: (label: string) => string;
  run: (
    fn: () => Promise<{ ok: true } | { error: string }>,
    successMsg?: string,
  ) => void;
}

function MarcoActions({
  vaga,
  marco,
  isPending,
  savingLabel,
  run,
}: MarcoActionsProps) {
  const desfazerKey = mapMarcoToDesfazerKey(marco.key);

  const desfazer =
    marco.status === "done" && desfazerKey ? (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => desfazerMarco(vaga.id, desfazerKey))}
        className="text-xs text-slate-500 underline underline-offset-2 hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Desfazer"}
      </button>
    ) : null;

  let actionButton: React.ReactNode = null;

  if (vaga.encerrada) {
    actionButton = null;
  } else {
    switch (marco.key) {
      case "briefing":
        actionButton = null;
        break;
      case "publicacao":
        if (!vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => publicarVaga(vaga.id), "Vaga publicada")}
              className="btn-primary text-sm"
            >
              {savingLabel("Publicar vaga")}
            </button>
          );
        }
        break;
      case "triagem":
        if (!vaga.dataTriagemConfirmada && vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() => confirmarTriagem(vaga.id), "Triagem confirmada")
              }
              className="btn-secondary text-sm"
            >
              {savingLabel("Confirmar triagem")}
            </button>
          );
        }
        break;
      case "entrevistas":
        if (!vaga.dataEntrevistasConfirmada && vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(
                  () => confirmarEntrevistas(vaga.id),
                  "Entrevistas confirmadas",
                )
              }
              className="btn-secondary text-sm"
            >
              {savingLabel("Confirmar entrevistas")}
            </button>
          );
        }
        break;
      case "shortlistInterna":
        if (!vaga.dataShortlistInterna && vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(
                  () => confirmarShortlistInterna(vaga.id),
                  "Shortlist interna registrada",
                )
              }
              className="btn-secondary text-sm"
            >
              {savingLabel("Registrar shortlist interna")}
            </button>
          );
        }
        break;
      case "entregaCliente":
        if (!vaga.shortlistEntregue && vaga.dataShortlistInterna) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(
                  () => marcarShortlistEntregue(vaga.id),
                  "Shortlist entregue",
                )
              }
              className="btn-lima text-sm"
            >
              {savingLabel("Marcar shortlist como entregue")}
            </button>
          );
        }
        break;
      case "retornoCliente":
        if (vaga.shortlistEntregue) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(
                  () => registrarContatoCliente(vaga.id),
                  "Contato com cliente registrado",
                )
              }
              className="btn-secondary text-sm"
            >
              {savingLabel("Registrar contato com cliente")}
            </button>
          );
        }
        break;
      case "fechamento":
        actionButton = null;
        break;
    }
  }

  if (!actionButton && !desfazer) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {actionButton}
      {desfazer}
    </div>
  );
}

function mapMarcoToDesfazerKey(
  key: MarcoComputed["key"],
):
  | "publicacao"
  | "triagem"
  | "entrevistas"
  | "shortlistInterna"
  | "entrega"
  | "contato"
  | null {
  switch (key) {
    case "publicacao":
      return "publicacao";
    case "triagem":
      return "triagem";
    case "entrevistas":
      return "entrevistas";
    case "shortlistInterna":
      return "shortlistInterna";
    case "entregaCliente":
      return "entrega";
    case "retornoCliente":
      return "contato";
    case "briefing":
    case "fechamento":
    default:
      return null;
  }
}
