import Link from "next/link";
import { ArrowUpRight, FileCheck2 } from "lucide-react";
import type { ProtocoloStatus } from "@prisma/client";
import { formatDateBR } from "@/lib/business-days";
import {
  PROTOCOLO_STATUS_LABEL,
  PROTOCOLO_STATUS_TONE,
} from "@/lib/protocolos";

export interface ProtocoloAtivoItem {
  id: string;
  status: ProtocoloStatus;
  profissionalNome: string;
  vagaId: string;
  vagaTitulo: string;
  clienteRazaoSocial: string;
  dataSaida: Date;
}

interface ProtocolosAtivosWidgetProps {
  protocolos: ProtocoloAtivoItem[];
  total: number;
  aguardando: number;
}

export function ProtocolosAtivosWidget({
  protocolos,
  total,
  aguardando,
}: ProtocolosAtivosWidgetProps) {
  if (total === 0) return null;

  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 size={16} className="text-amber-700" />
          <div>
            <div className="section-label">Reposições</div>
            <h2 className="text-h3 text-ink">Protocolos em curso</h2>
          </div>
        </div>
        <Link
          href="/reposicoes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-royal transition hover:text-royal-700"
        >
          Ver todos
          <ArrowUpRight size={12} />
        </Link>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          {total} em curso
        </span>
        {aguardando > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            {aguardando} aguardando cliente
          </span>
        )}
      </div>

      <ul className="divide-y divide-line/70">
        {protocolos.map((p) => {
          const tone = PROTOCOLO_STATUS_TONE[p.status];
          return (
            <li key={p.id} className="py-2.5">
              <Link
                href={`/vagas/${p.vagaId}`}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {p.profissionalNome}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {p.clienteRazaoSocial} · {p.vagaTitulo} · saída{" "}
                    {formatDateBR(p.dataSaida)}
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
                >
                  {PROTOCOLO_STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
