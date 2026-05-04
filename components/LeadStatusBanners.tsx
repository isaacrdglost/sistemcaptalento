import Link from "next/link";
import { ArrowUpRight, Sparkles, XCircle } from "lucide-react";
import { formatDateBR } from "@/lib/business-days";

interface BannerLeadGanhoProps {
  dataGanho: Date | null;
  cliente: { id: string; razaoSocial: string } | null;
}

export function BannerLeadGanho({ dataGanho, cliente }: BannerLeadGanhoProps) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-lima-100 bg-lima-50/60 p-4">
      <div className="flex items-start gap-2 text-sm text-lima-700">
        <Sparkles size={16} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Lead convertido em cliente</div>
          {dataGanho ? (
            <div className="text-xs text-lima-700/80">
              em {formatDateBR(dataGanho)}
            </div>
          ) : null}
        </div>
      </div>
      {cliente ? (
        <Link
          href={`/clientes/${cliente.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-lima-700 transition hover:text-lima-700/80"
        >
          Abrir cliente
          <ArrowUpRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}

interface BannerLeadPerdidoProps {
  dataPerda: Date | null;
  motivoPerda: string | null;
}

export function BannerLeadPerdido({
  dataPerda,
  motivoPerda,
}: BannerLeadPerdidoProps) {
  return (
    <div className="card flex flex-wrap items-start justify-between gap-3 border-red-100 bg-red-50/50 p-4">
      <div className="flex items-start gap-2 text-sm text-red-700">
        <XCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Lead marcado como perdido</div>
          {dataPerda ? (
            <div className="text-xs text-red-700/80">
              em {formatDateBR(dataPerda)}
            </div>
          ) : null}
          {motivoPerda ? (
            <div className="mt-1.5 text-sm text-red-700/90">
              <span className="font-semibold">Motivo:</span> {motivoPerda}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
