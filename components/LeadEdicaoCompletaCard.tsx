"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { Lead } from "@prisma/client";
import { LeadInfoForm } from "@/components/LeadInfoForm";
import { cn } from "@/lib/utils";

interface LeadEdicaoCompletaCardProps {
  lead: Lead;
  podeAgir: boolean;
}

export function LeadEdicaoCompletaCard({
  lead,
  podeAgir,
}: LeadEdicaoCompletaCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Pencil size={14} className="text-slate-400" />
          <span className="section-label">Edição completa</span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {!open ? (
        <p className="mt-2 text-xs text-slate-500">
          Empresa, contato, mensagem, observações e UTMs.
        </p>
      ) : (
        <div className="mt-4 border-t border-line/70 pt-4">
          <LeadInfoForm
            mode="edit"
            lead={lead}
            readOnly={!podeAgir}
          />
        </div>
      )}
    </section>
  );
}
