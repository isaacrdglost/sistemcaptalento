"use client";

import { LayoutGrid, LayoutList } from "lucide-react";

interface LeadViewToggleProps {
  value: "lista" | "kanban";
  onChange: (v: "lista" | "kanban") => void;
}

export function LeadViewToggle({ value, onChange }: LeadViewToggleProps) {
  const opcoes: {
    value: "lista" | "kanban";
    label: string;
    icon: typeof LayoutList;
  }[] = [
    { value: "lista", label: "Lista", icon: LayoutList },
    { value: "kanban", label: "Kanban", icon: LayoutGrid },
  ];

  return (
    <div className="inline-flex rounded-lg border border-line bg-slate-50 p-0.5">
      {opcoes.map((opt) => {
        const ativo = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={ativo}
            aria-label={`Visualizar como ${opt.label}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              ativo
                ? "bg-white text-ink shadow-xs"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
