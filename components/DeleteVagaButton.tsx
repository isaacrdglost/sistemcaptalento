"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { excluirVaga } from "@/app/admin/actions";
import { useConfirm } from "./ConfirmDialog";

interface DeleteVagaButtonProps {
  vagaId: string;
}

export function DeleteVagaButton({ vagaId }: DeleteVagaButtonProps) {
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
