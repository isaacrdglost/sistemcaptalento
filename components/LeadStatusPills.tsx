"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Sparkles, XCircle } from "lucide-react";
import type { EstagioLead } from "@prisma/client";
import { useConfirm } from "@/components/ConfirmDialog";
import { GanharLeadDialog } from "@/components/GanharLeadDialog";
import { PerderLeadDialog } from "@/components/PerderLeadDialog";
import {
  moverEstagio,
  reabrirParaEstagio,
} from "@/app/comercial/actions";
import { cn } from "@/lib/utils";

interface LeadStatusPillsProps {
  leadId: string;
  estagioAtual: EstagioLead;
  razaoSocial: string;
  podeAgir: boolean;
}

type EstagioAtivo = "novo" | "qualificado" | "proposta" | "negociacao";

const PILLS: { value: EstagioAtivo; label: string; tone: string }[] = [
  {
    value: "novo",
    label: "Novo",
    tone: "bg-slate-700 text-white ring-slate-700",
  },
  {
    value: "qualificado",
    label: "Qualificado",
    tone: "bg-royal text-white ring-royal",
  },
  {
    value: "proposta",
    label: "Proposta",
    tone: "bg-amber-500 text-white ring-amber-500",
  },
  {
    value: "negociacao",
    label: "Negociação",
    tone: "bg-amber-600 text-white ring-amber-600",
  },
];

export function LeadStatusPills({
  leadId,
  estagioAtual,
  razaoSocial,
  podeAgir,
}: LeadStatusPillsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [optimisticEstagio, setOptimisticEstagio] =
    useState<EstagioLead>(estagioAtual);
  const [ganharOpen, setGanharOpen] = useState(false);
  const [perderOpen, setPerderOpen] = useState(false);

  const finalizado =
    optimisticEstagio === "ganho" || optimisticEstagio === "perdido";

  function mover(novo: EstagioAtivo) {
    if (!podeAgir || isPending) return;
    if (optimisticEstagio === novo) return;
    const anterior = optimisticEstagio;
    setOptimisticEstagio(novo);
    startTransition(async () => {
      const result = await moverEstagio(leadId, novo);
      if ("error" in result) {
        setOptimisticEstagio(anterior);
        toast.error(result.error);
        return;
      }
      toast.success("Estágio atualizado");
      router.refresh();
    });
  }

  async function reabrir() {
    const ok = await confirm({
      title: "Reabrir lead",
      message:
        "O lead volta pro estágio Qualificado e fica ativo no funil novamente.",
      confirmLabel: "Reabrir",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await reabrirParaEstagio(leadId, "qualificado");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Lead reaberto no funil");
      router.refresh();
    });
  }

  return (
    <>
      <section className="card p-5">
        <div className="mb-4">
          <div className="section-label mb-1">Pipeline</div>
          <h3 className="text-sm font-semibold text-ink">
            Estágio do lead
          </h3>
        </div>

        {!finalizado ? (
          <>
            {podeAgir ? (
              <div className="mb-4 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setGanharOpen(true)}
                  disabled={isPending}
                  className="btn-lima w-full"
                >
                  <Sparkles size={14} />
                  Marcar como ganho
                </button>
                <button
                  type="button"
                  onClick={() => setPerderOpen(true)}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-xs transition-all duration-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Marcar como perdido
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {PILLS.map((pill) => {
                const ativo = optimisticEstagio === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => mover(pill.value)}
                    disabled={!podeAgir || isPending}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all duration-150",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      ativo
                        ? pill.tone
                        : "bg-white text-slate-600 ring-line hover:bg-slate-50 hover:text-ink",
                    )}
                    aria-pressed={ativo}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              Lead finalizado como{" "}
              <span className="font-semibold text-ink">
                {optimisticEstagio === "ganho" ? "ganho" : "perdido"}
              </span>
              . Reabra pra movimentar de novo.
            </div>
            {podeAgir ? (
              <button
                type="button"
                onClick={reabrir}
                disabled={isPending}
                className="btn-secondary w-full"
              >
                <RotateCcw size={14} />
                Reabrir lead
              </button>
            ) : null}
          </div>
        )}
      </section>

      <GanharLeadDialog
        leadId={ganharOpen ? leadId : null}
        leadRazaoSocial={razaoSocial}
        onClose={() => setGanharOpen(false)}
      />
      <PerderLeadDialog
        leadId={perderOpen ? leadId : null}
        leadRazaoSocial={razaoSocial}
        onClose={() => setPerderOpen(false)}
      />
    </>
  );
}
