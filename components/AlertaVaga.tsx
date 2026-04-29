import { AlertCircle, AlertTriangle } from "lucide-react";
import type { VagaAlerta } from "@/lib/flows";

interface AlertaVagaProps {
  alertas: VagaAlerta[];
}

const TONE = {
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-red-50 text-red-600 ring-red-100",
    border: "border-red-100",
    title: "text-red-700",
  },
  warning: {
    icon: AlertCircle,
    iconBg: "bg-amber-50 text-amber-600 ring-amber-100",
    border: "border-amber-100",
    title: "text-amber-700",
  },
} as const;

function extractDias(descricao: string): string | null {
  // Captura "N dias úteis" pra renderizar como mini-meta destacada.
  const m = descricao.match(/(\d+)\s*dias?\s*úteis?/i);
  if (m) return `${m[1]} dias úteis`;
  return null;
}

export function AlertaVaga({ alertas }: AlertaVagaProps) {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alertas.map((alerta, idx) => {
        const tone = TONE[alerta.nivel];
        const Icon = tone.icon;
        const meta = extractDias(alerta.descricao);

        return (
          <div
            key={`${alerta.titulo}-${idx}`}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 shadow-xs animate-fade-in-up ${tone.border}`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tone.iconBg}`}
              aria-hidden
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold leading-tight ${tone.title}`}
              >
                {alerta.titulo}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {alerta.descricao}
              </p>
              {meta && (
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                  {meta}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
