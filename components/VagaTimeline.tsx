"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Vaga } from "@prisma/client";
import { formatDateBR, formatDiasRestantes } from "@/lib/business-days";
import { fluxoLabel, prazoCor } from "@/lib/flows";
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

const dotByStatus = {
  done: "bg-royal border-royal",
  current: "bg-royal border-royal ring-4 ring-royal-100",
  late: "bg-red-600 border-red-600",
  pending: "bg-white border-slate-300",
} as const;

const PRAZO_TEXT_CLASS: Record<
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
    className: PRAZO_TEXT_CLASS[prazoCor(marco.diasRestantes)],
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
      <h2 className="text-lg font-bold mb-1">Linha do tempo</h2>
      <p className="text-sm text-slate-500 mb-6">
        Marcos derivados do fluxo {fluxoLabel(vaga.fluxo)}.
      </p>

      <ol className="relative flex flex-col">
        {derived.marcos.map((marco, idx) => {
          const isLast = idx === derived.marcos.length - 1;
          const dotClass = dotByStatus[marco.status];
          const dias = diasRestantesTexto(marco);

          return (
            <li key={marco.key} className="relative flex gap-4 pb-8 last:pb-0">
              {/* linha vertical */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-6 -bottom-0 w-px bg-slate-200"
                />
              )}

              {/* bolinha */}
              <span
                aria-hidden
                className={`relative z-[1] mt-1 block h-6 w-6 shrink-0 rounded-full border-2 ${dotClass}`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-semibold text-ink">{marco.label}</h3>
                  <span className="text-sm text-slate-500">
                    {marco.dataPrevista
                      ? `${marco.status === "late" ? "Venceu em" : "Previsto:"} ${formatDateBR(marco.dataPrevista)}`
                      : "Aguardando publicação"}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mt-0.5">
                  {marco.description}
                </p>

                {marco.dataRealizada && (
                  <p className="text-xs text-lima-700 mt-1">
                    ✓ Confirmado em {formatDateBR(marco.dataRealizada)}
                  </p>
                )}

                {dias && (
                  <p className={`text-xs mt-1 font-medium ${dias.className}`}>
                    {dias.label}
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

  // Vaga encerrada: não mostra ações (exceto possíveis "Desfazer" no marco done)
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
              onClick={() => run(() => confirmarTriagem(vaga.id), "Triagem confirmada")}
              className="btn-secondary text-sm"
            >
              {savingLabel("Confirmar triagem")}
            </button>
          );
        }
        break;
      case "entrevistas":
        // Exige publicação (não fazia sentido confirmar entrevistas sem publicar)
        if (!vaga.dataEntrevistasConfirmada && vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => confirmarEntrevistas(vaga.id), "Entrevistas confirmadas")}
              className="btn-secondary text-sm"
            >
              {savingLabel("Confirmar entrevistas")}
            </button>
          );
        }
        break;
      case "shortlistInterna":
        // Exige publicação
        if (!vaga.dataShortlistInterna && vaga.dataPublicacao) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => confirmarShortlistInterna(vaga.id), "Shortlist interna registrada")}
              className="btn-secondary text-sm"
            >
              {savingLabel("Registrar shortlist interna")}
            </button>
          );
        }
        break;
      case "entregaCliente":
        // Exige shortlist interna registrada
        if (!vaga.shortlistEntregue && vaga.dataShortlistInterna) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => marcarShortlistEntregue(vaga.id), "Shortlist entregue")}
              className="btn-lima text-sm"
            >
              {savingLabel("Marcar shortlist como entregue")}
            </button>
          );
        }
        break;
      case "retornoCliente":
        // Só faz sentido depois da entrega
        if (vaga.shortlistEntregue) {
          actionButton = (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => registrarContatoCliente(vaga.id), "Contato com cliente registrado")}
              className="btn-secondary text-sm"
            >
              {savingLabel("Registrar contato com cliente")}
            </button>
          );
        }
        break;
      case "fechamento":
        // Encerramento fica nas Informações gerais à direita — não duplicar aqui
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
