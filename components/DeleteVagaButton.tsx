"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirVaga } from "@/app/admin/actions";
import { useConfirm } from "./ConfirmDialog";

interface DeleteVagaButtonProps {
  vagaId: string;
  /** Quando true, renderiza apenas o ícone (uso em tabelas). */
  iconOnly?: boolean;
}

export function DeleteVagaButton({
  vagaId,
  iconOnly = true,
}: DeleteVagaButtonProps) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleClick() {
    const ok = await confirm({
      title: "Excluir vaga",
      message:
        "Todos os candidatos, atividades e histórico serão removidos. Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir vaga",
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await excluirVaga(vagaId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Vaga excluída");
      }
    });
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label="Excluir vaga"
        title="Excluir vaga"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-semibold text-red-600 transition hover:underline disabled:opacity-50"
    >
      {pending ? "Excluindo…" : "Excluir"}
    </button>
  );
}
