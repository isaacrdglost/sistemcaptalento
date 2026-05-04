"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArchiveRestore,
  Hand,
  RotateCcw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import type { EstagioLead } from "@prisma/client";
import { useConfirm } from "@/components/ConfirmDialog";
import { GanharLeadDialog } from "@/components/GanharLeadDialog";
import { PerderLeadDialog } from "@/components/PerderLeadDialog";
import {
  arquivarLead,
  pegarLead,
  reabrirLead,
  reabrirParaEstagio,
} from "@/app/comercial/actions";

interface LeadDetailActionsProps {
  leadId: string;
  semResponsavel: boolean;
  arquivado: boolean;
  podeAgir: boolean;
  estagio: EstagioLead;
  razaoSocial: string;
}

export function LeadDetailActions({
  leadId,
  semResponsavel,
  arquivado,
  podeAgir,
  estagio,
  razaoSocial,
}: LeadDetailActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [ganharOpen, setGanharOpen] = useState(false);
  const [perderOpen, setPerderOpen] = useState(false);

  const finalizado = estagio === "ganho" || estagio === "perdido";
  const ativoNoFunil =
    estagio === "novo" ||
    estagio === "qualificado" ||
    estagio === "proposta" ||
    estagio === "negociacao";

  function handlePegar() {
    startTransition(async () => {
      const result = await pegarLead(leadId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Lead atribuído a você");
      router.refresh();
    });
  }

  async function handleArquivar() {
    if (!arquivado) {
      const ok = await confirm({
        title: "Arquivar lead",
        message:
          "Leads arquivados ficam fora da listagem padrão. Você pode reabrir depois.",
        confirmLabel: "Arquivar",
        danger: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const result = arquivado
        ? await reabrirLead(leadId)
        : await arquivarLead(leadId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(arquivado ? "Lead reaberto" : "Lead arquivado");
      router.refresh();
    });
  }

  async function handleReabrirParaEstagio() {
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
      <div className="flex flex-wrap items-center gap-2">
        {semResponsavel ? (
          <button
            type="button"
            onClick={handlePegar}
            disabled={isPending}
            className="btn-primary"
          >
            <Hand size={14} />
            Pegar pra mim
          </button>
        ) : null}

        {podeAgir && ativoNoFunil ? (
          <>
            <button
              type="button"
              onClick={() => setGanharOpen(true)}
              disabled={isPending}
              className="btn-lima"
            >
              <Sparkles size={14} />
              Marcar como ganho
            </button>
            <button
              type="button"
              onClick={() => setPerderOpen(true)}
              disabled={isPending}
              className="btn-secondary"
            >
              <XCircle size={14} />
              Marcar como perdido
            </button>
          </>
        ) : null}

        {podeAgir && finalizado ? (
          <button
            type="button"
            onClick={handleReabrirParaEstagio}
            disabled={isPending}
            className="btn-secondary"
          >
            <RotateCcw size={14} />
            Reabrir lead
          </button>
        ) : null}

        {podeAgir ? (
          <button
            type="button"
            onClick={handleArquivar}
            disabled={isPending}
            className={arquivado ? "btn-secondary" : "btn-ghost"}
          >
            {arquivado ? (
              <>
                <ArchiveRestore size={14} />
                Reabrir arquivado
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Arquivar
              </>
            )}
          </button>
        ) : null}
      </div>

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
