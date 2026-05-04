import type { TipoAtividadeLead } from "@prisma/client";
import { History } from "lucide-react";
import { descricaoEstagioLead } from "@/lib/activity-lead";
import { formatRelative } from "@/lib/business-days";
import { cn } from "@/lib/utils";

interface AtividadeItem {
  id: string;
  tipo: TipoAtividadeLead;
  descricao: string;
  metadata: unknown;
  agendadoPara: Date | null;
  concluidoEm: Date | null;
  createdAt: Date;
  autor: { id: string; nome: string };
}

interface LeadHistoricoStatusProps {
  atividades: AtividadeItem[];
}

const DOT_POR_ESTAGIO: Record<string, string> = {
  novo: "bg-slate-400",
  qualificado: "bg-royal",
  proposta: "bg-amber-500",
  negociacao: "bg-amber-600",
  ganho: "bg-lima",
  perdido: "bg-red-500",
};

interface MudancaItem {
  id: string;
  tipo: TipoAtividadeLead;
  createdAt: Date;
  autorNome: string;
  estagio: string;
}

function metadataToObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extrairEstagio(it: AtividadeItem): string {
  if (it.tipo === "lead_ganho") return "ganho";
  if (it.tipo === "lead_perdido") return "perdido";
  const meta = metadataToObject(it.metadata);
  const para = meta?.para;
  if (typeof para === "string" && para.length > 0) return para;
  return "novo";
}

export function LeadHistoricoStatus({
  atividades,
}: LeadHistoricoStatusProps) {
  const filtradas: MudancaItem[] = atividades
    .filter(
      (a) =>
        a.tipo === "mudanca_estagio" ||
        a.tipo === "lead_ganho" ||
        a.tipo === "lead_perdido",
    )
    .map((a) => ({
      id: a.id,
      tipo: a.tipo,
      createdAt: a.createdAt,
      autorNome: a.autor.nome,
      estagio: extrairEstagio(a),
    }));

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <History size={14} className="text-slate-400" />
        <div className="section-label">Histórico de status</div>
      </div>

      {filtradas.length === 0 ? (
        <p className="text-xs text-slate-400">
          Sem mudanças de estágio registradas.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtradas.map((it) => (
            <li
              key={it.id}
              className="flex items-start gap-2.5 text-xs text-slate-600"
            >
              <span
                className={cn(
                  "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                  DOT_POR_ESTAGIO[it.estagio] ?? "bg-slate-300",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">
                  {descricaoEstagioLead(it.estagio)}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {it.autorNome} · {formatRelative(it.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
