import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export interface LeadParadoItem {
  id: string;
  razaoSocial: string;
  responsavel: { id: string; nome: string } | null;
}

interface BannerLeadsParadosProps {
  total: number;
  exemplos: LeadParadoItem[];
}

/**
 * Banner exibido no topo do pipeline quando há leads sem update há mais
 * de 7 dias. A ideia é gerar urgência leve — lead esquecido esfria. O
 * link envia o usuário para a lista filtrada (`?stuck=1`).
 */
export function BannerLeadsParados({
  total,
  exemplos,
}: BannerLeadsParadosProps) {
  if (total === 0) return null;

  // Lista de donos únicos (até 4) — empresas sem responsável usam "?".
  const donosVistos = new Set<string>();
  const donos: { id: string; nome: string }[] = [];
  for (const lead of exemplos) {
    const dono = lead.responsavel;
    const key = dono ? dono.id : "__sem__";
    if (donosVistos.has(key)) continue;
    donosVistos.add(key);
    donos.push(dono ?? { id: "__sem__", nome: "?" });
    if (donos.length >= 4) break;
  }
  const totalDonosUnicos = new Set(
    exemplos.map((l) => (l.responsavel ? l.responsavel.id : "__sem__")),
  ).size;
  const donosExtras = Math.max(0, totalDonosUnicos - donos.length);

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: "0ms" }}
      role="status"
    >
      <Link
        href="/comercial?stuck=1"
        className="group flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 transition hover:border-amber-300 hover:bg-amber-50/70 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertCircle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900">
            {total === 1
              ? "1 lead parado há mais de 7 dias"
              : `${total} leads parados há mais de 7 dias`}
          </div>
          <div className="mt-0.5 text-xs text-amber-800/80">
            Lead esquecido esfria — clique em um pra retomar
          </div>
        </div>
        {donos.length > 0 ? (
          <div className="flex items-center -space-x-2">
            {donos.map((d) => (
              <span key={d.id} className="rounded-full ring-2 ring-amber-50">
                <Avatar nome={d.nome} size="sm" />
              </span>
            ))}
            {donosExtras > 0 ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-amber-700 ring-2 ring-amber-50">
                +{donosExtras}
              </span>
            ) : null}
          </div>
        ) : null}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition group-hover:translate-x-0.5">
          Ver todos
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  );
}
