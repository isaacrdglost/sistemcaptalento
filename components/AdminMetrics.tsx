import { BarChart3, Users } from "lucide-react";
import type { ActivityBucket, TopRecrutador } from "@/lib/metrics";

interface AdminMetricsProps {
  buckets30d: ActivityBucket[];
  maxBucket: number;
  criadasUltimos30d: number;
  topRecrutadores: TopRecrutador[];
}

/**
 * Painel inferior do dashboard admin: top recrutadoras + atividade 30d.
 * Os KPIs principais agora ficam em StatCards no topo da página.
 */
export function AdminMetrics({
  buckets30d,
  maxBucket,
  criadasUltimos30d,
  topRecrutadores,
}: AdminMetricsProps) {
  const totalAtivas = topRecrutadores.reduce((acc, r) => acc + r.count, 0);
  const maxTopCount = topRecrutadores.reduce(
    (acc, r) => (r.count > acc ? r.count : acc),
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Atividade últimos 30 dias */}
      <div
        className="card animate-fade-in-up p-5"
        style={{ animationDelay: "120ms" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-royal" />
            <span className="section-label">Atividade últimos 30 dias</span>
          </div>
          <span className="text-xs text-slate-500">
            {criadasUltimos30d}{" "}
            {criadasUltimos30d === 1 ? "vaga criada" : "vagas criadas"}
          </span>
        </div>

        <ActivityChart buckets={buckets30d} max={maxBucket} />

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
          <span>{buckets30d[0]?.label ?? ""}</span>
          <span>{buckets30d[buckets30d.length - 1]?.label ?? ""}</span>
        </div>
      </div>

      {/* Top recrutadoras */}
      <div
        className="card animate-fade-in-up p-5"
        style={{ animationDelay: "160ms" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-royal" />
            <span className="section-label">Top recrutadoras</span>
          </div>
          <span className="text-xs text-slate-500">Por vagas ativas</span>
        </div>

        {topRecrutadores.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma vaga ativa no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {topRecrutadores.map((r) => {
              const denominador = maxTopCount > 0 ? maxTopCount : 1;
              const pct = Math.round((r.count / denominador) * 100);
              const share =
                totalAtivas > 0
                  ? Math.round((r.count / totalAtivas) * 100)
                  : 0;
              return (
                <li key={r.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-ink">
                      {r.nome}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {r.count} {r.count === 1 ? "vaga" : "vagas"}
                      {totalAtivas > 0 ? ` • ${share}%` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full bg-royal transition-all duration-500 ease-smooth"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ActivityChartProps {
  buckets: ActivityBucket[];
  max: number;
}

function ActivityChart({ buckets, max }: ActivityChartProps) {
  const minHeightPct = 4; // mantém bar visível mesmo com 0
  return (
    <div
      className="flex h-24 items-end gap-[2px]"
      role="img"
      aria-label="Gráfico de barras com vagas criadas por dia nos últimos 30 dias"
    >
      {buckets.map((b, i) => {
        const ratio = max > 0 ? b.count / max : 0;
        const heightPct =
          b.count === 0
            ? minHeightPct
            : Math.max(minHeightPct + 4, Math.round(ratio * 100));
        const barClass =
          b.count === 0
            ? "bg-slate-100"
            : "bg-royal-200 hover:bg-royal-300";
        const titleDate = b.date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const titleCount =
          b.count === 1 ? "1 vaga criada" : `${b.count} vagas criadas`;
        return (
          <div
            key={i}
            title={`${titleDate} — ${titleCount}`}
            className={`flex-1 rounded-sm transition ${barClass}`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
