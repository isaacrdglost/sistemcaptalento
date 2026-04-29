import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Vaga } from "@prisma/client";
import { computeVagaDerived, fluxoLabel, prazoCor } from "@/lib/flows";
import { formatDateBR, formatDiasRestantes } from "@/lib/business-days";
import { DeleteVagaButton } from "./DeleteVagaButton";

export type AdminVagaRow = Vaga & {
  recrutador: { id: string; nome: string };
};

interface AdminVagasTableProps {
  vagas: AdminVagaRow[];
}

const PRAZO_TEXT_CLASSES: Record<
  "verde" | "ambar" | "vermelho" | "neutro",
  string
> = {
  verde: "text-emerald-700",
  ambar: "text-amber-700",
  vermelho: "text-red-700",
  neutro: "text-slate-500",
};

export function AdminVagasTable({ vagas }: AdminVagasTableProps) {
  if (vagas.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500">
        Nenhuma vaga cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="table-auto w-full text-sm">
        <thead className="bg-slate-50/50 border-b border-line/70">
          <tr className="text-eyebrow uppercase text-slate-500">
            <th className="px-4 py-3 text-left font-semibold">Título</th>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Recrutadora</th>
            <th className="px-4 py-3 text-left font-semibold">Fluxo</th>
            <th className="px-4 py-3 text-left font-semibold">Fase</th>
            <th className="px-4 py-3 text-left font-semibold">Prazo final</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {vagas.map((vaga) => {
            const derived = computeVagaDerived(vaga);
            const cor = prazoCor(derived.diasRestantesPrazo);
            const prazoClasse = PRAZO_TEXT_CLASSES[cor];
            const fluxoClasse =
              vaga.fluxo === "rapido" ? "badge-lima" : "badge-royal";

            return (
              <tr
                key={vaga.id}
                className="align-middle transition hover:bg-slate-50/30"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{vaga.titulo}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{vaga.cliente}</td>
                <td className="px-4 py-3 text-slate-600">
                  {vaga.recrutador.nome}
                </td>
                <td className="px-4 py-3">
                  <span className={fluxoClasse}>{fluxoLabel(vaga.fluxo)}</span>
                </td>
                <td className="px-4 py-3">
                  {derived.fase === 1 ? (
                    <span className="badge-slate">Fase 1</span>
                  ) : (
                    <span className="badge-royal">Fase 2</span>
                  )}
                </td>
                <td className={`px-4 py-3 ${prazoClasse}`}>
                  <div className="text-sm font-medium">
                    {formatDateBR(derived.prazoFinal)}
                  </div>
                  <div className="text-xs">
                    {vaga.encerrada
                      ? "encerrada"
                      : formatDiasRestantes(derived.diasRestantesPrazo, {
                          short: true,
                        })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {vaga.encerrada ? (
                    <span className="badge-dot bg-slate-100 text-slate-600 ring-slate-200">
                      Encerrada
                    </span>
                  ) : (
                    <span className="badge-dot bg-emerald-50 text-emerald-700 ring-emerald-100">
                      Ativa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/vagas/${vaga.id}`}
                      aria-label="Abrir vaga"
                      title="Abrir vaga"
                      className="btn-icon"
                    >
                      <ExternalLink size={14} />
                    </Link>
                    <DeleteVagaButton vagaId={vaga.id} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
