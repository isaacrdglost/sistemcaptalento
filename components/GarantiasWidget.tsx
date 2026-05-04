import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import {
  diasRestantesGarantia,
  toneGarantia,
} from "@/lib/garantia";
import { formatDateBR } from "@/lib/business-days";

export interface GarantiaWidgetItem {
  id: string;
  candidatoNome: string;
  clienteRazaoSocial: string;
  dataAdmissao: Date;
  dataFimGarantia: Date;
}

interface GarantiasWidgetProps {
  vigentes: GarantiaWidgetItem[];
  totalVigentes: number;
  totalAcionadas: number;
}

export function GarantiasWidget({
  vigentes,
  totalVigentes,
  totalAcionadas,
}: GarantiasWidgetProps) {
  if (totalVigentes === 0 && totalAcionadas === 0) return null;

  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-lima-700" />
          <div>
            <div className="section-label">Pós-contratação</div>
            <h2 className="text-h3 text-ink">Garantias em curso</h2>
          </div>
        </div>
        <Link
          href="/contratacoes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-royal transition hover:text-royal-700"
        >
          Ver todas
          <ArrowUpRight size={12} />
        </Link>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-lima-100 px-2 py-0.5 font-semibold text-lima-700 ring-1 ring-inset ring-lima-200">
          {totalVigentes} vigente{totalVigentes === 1 ? "" : "s"}
        </span>
        {totalAcionadas > 0 && (
          <Link
            href="/contratacoes?tab=acionadas"
            className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-200"
          >
            {totalAcionadas} acionada{totalAcionadas === 1 ? "" : "s"}
          </Link>
        )}
      </div>

      {vigentes.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma garantia em curso.
        </p>
      ) : (
        <ul className="divide-y divide-line/70">
          {vigentes.map((g) => {
            const tone = toneGarantia("em_garantia", g.dataFimGarantia);
            const dias = diasRestantesGarantia(g.dataFimGarantia);
            const toneText: Record<typeof tone, string> = {
              lima: "text-lima-700",
              amber: "text-amber-700",
              red: "text-red-700",
              slate: "text-slate-500",
            };
            return (
              <li key={g.id} className="py-2.5">
                <Link
                  href={`/contratacoes/${g.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {g.candidatoNome}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {g.clienteRazaoSocial} · admissão{" "}
                      {formatDateBR(g.dataAdmissao)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${toneText[tone]}`}
                  >
                    {dias > 0 ? `${dias}d` : "vencendo"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
