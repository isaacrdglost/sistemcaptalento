"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hand } from "lucide-react";
import { pegarLead } from "@/app/comercial/actions";

interface ComercialPegarLeadButtonProps {
  leadId: string;
}

export function ComercialPegarLeadButton({
  leadId,
}: ComercialPegarLeadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <button
      type="button"
      onClick={handlePegar}
      disabled={isPending}
      className="btn-ghost text-xs"
    >
      <Hand size={12} />
      <span>Pegar</span>
    </button>
  );
}
