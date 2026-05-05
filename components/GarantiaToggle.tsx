"use client";

import { ShieldCheck } from "lucide-react";

interface GarantiaToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle "Vaga com garantia de reposição". Quando ligado, a vaga
 * participa do fluxo de protocolo (registrar contratação, abrir
 * protocolo se sair, escolher substituto). Quando desligado, é uma
 * colocação tradicional sem cobertura pós-admissão.
 */
export function GarantiaToggle({
  value,
  onChange,
  disabled = false,
}: GarantiaToggleProps) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lima-100 text-lima-700">
            <ShieldCheck size={14} />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink">
              Garantia de reposição
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Vaga entra no fluxo de protocolo: registro de contratação,
              acompanhamento dos 30 dias e reposição se necessário.
            </p>
          </div>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-lima-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></span>
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
        </label>
      </div>
    </div>
  );
}
