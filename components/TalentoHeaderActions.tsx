"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  arquivarTalento,
  reativarTalento,
} from "@/app/talentos/actions";
import { useConfirm } from "./ConfirmDialog";

interface TalentoHeaderActionsProps {
  talentoId: string;
  ativo: boolean;
}

export function TalentoHeaderActions({
  talentoId,
  ativo,
}: TalentoHeaderActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  async function handleArquivar() {
    const ok = await confirm({
      title: "Arquivar talento",
      message:
        "O talento some do banco padrão, mas continua visível quando você marcar 'Incluir arquivados'. Vínculos com vagas permanecem.",
      confirmLabel: "Arquivar",
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await arquivarTalento(talentoId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Talento arquivado");
        router.refresh();
      }
    });
  }

  function handleReativar() {
    startTransition(async () => {
      const result = await reativarTalento(talentoId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Talento reativado");
        router.refresh();
      }
    });
  }

  if (ativo) {
    return (
      <button
        type="button"
        onClick={handleArquivar}
        disabled={isPending}
        className="btn-danger"
      >
        <Archive size={14} className="shrink-0" />
        <span>{isPending ? "Salvando…" : "Arquivar"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleReativar}
      disabled={isPending}
      className="btn-secondary"
    >
      <RotateCcw size={14} className="shrink-0" />
      <span>{isPending ? "Salvando…" : "Reativar"}</span>
    </button>
  );
}
