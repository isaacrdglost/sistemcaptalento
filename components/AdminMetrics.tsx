import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Clock,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { computeAdminMetrics } from "@/lib/metrics";
import type { VagaWithRecrutador } from "./VagaCard";

interface AdminMetricsProps {
  vagas: VagaWithRecrutador[];
}

export function AdminMetrics({ vagas }: AdminMetricsProps) {
  const now = new Date();
  const metrics = computeAdminMetrics(vagas, now);
  const {
    ativas,
    criadasUltimos30d,
    emAtraso,
    shortlistsMes,
    tempoMedioShortlistDiasUteis,
    buckets30d,
    maxBucket,
    topRecrutadores,
  } = metrics;

  const totalAtivas = topRecrutadores.reduce((acc, r) => acc + r.count, 0);
  const maxTopCount = topRecrutadores.reduce(
    (acc, r) => (r.count > acc ? r.count : acc),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Linha 1 — 4 KPIs principais */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          index={0}
          icon={<Briefcase size={16} className="text-royal" />}
          label="Vagas ativas"
          value={ativas}
          footer={
            <span className="flex items-center gap-1 text-xs text-slate-500">
              {criadasUltimos30d > 0 ? (
                <TrendingUp size={12} className="text-emerald-600" />
              ) : (
                <TrendingDown size={12} className="text-slate-400" />
              )}
              <span>
                {criadasUltimos30d} criadas nos últimos 30d
              </span>
            </span>
          }
        />

        <KpiCard
          index={1}
          icon={
            <AlertTriangle
              size={16}
              className={emAtraso > 0 ? "text-red-600" : "text-slate-400"}
            />
          }
          label="Em atraso"
          value={emAtraso}
          valueClassName={emAtraso > 0 ? "text-red-600" : "text-ink"}
          footer={
            <span className="text-xs text-slate-500">
              {emAtraso === 0
                ? "Nenhuma vaga com alertas"
                : emAtraso === 1
                  ? "1 vaga exige atenção"
                  : `${emAtraso} vagas exigem atenção`}
            </span>
          }
        />

        <KpiCard
          index={2}
          icon={
            <Target
              size={16}
              className={shortlistsMes > 0 ? "text-lima-600" : "text-slate-400"}
            />
          }
          label="Shortlists no mês"
          value={shortlistsMes}
          valueClassName={shortlistsMes > 0 ? "text-lima-700" : "text-ink"}
          footer={
            <span className="text-xs text-slate-500">
              Entregues desde o dia 1
            </span>
          }
        />

        <KpiCard
          index={3}
          icon={<Clock size={16} className="text-royal" />}
          label="Tempo médio até shortlist"
          value={
            tempoMedioShortlistDiasUteis === null
              ? "— d"
              : `${formatMedia(tempoMedioShortlistDiasUteis)} d`
          }
          footer={
            <span className="text-xs text-slate-500">
              {tempoMedioShortlistDiasUteis === null
                ? "Sem entregas suficientes"
                : "Média em dias úteis"}
            </span>
          }
        />
      </div>

      {/* Linha 2 — Gráfico + Top recrutadoras */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className="card animate-fade-in-up p-5 md:col-span-2"
          style={{ animationDelay: "160ms" }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-royal" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Atividade nos últimos 30 dias
              </span>
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

        <div
          className="card animate-fade-in-up p-5"
          style={{ animationDelay: "200ms" }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Top recrutadoras
            </span>
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
                        {r.count}{" "}
                        {r.count === 1 ? "vaga" : "vagas"}
                        {totalAtivas > 0 ? ` • ${share}%` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-royal transition-all"
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
    </div>
  );
}

interface KpiCardProps {
  index: number;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
  footer?: React.ReactNode;
}

function KpiCard({
  index,
  icon,
  label,
  value,
  valueClassName,
  footer,
}: KpiCardProps) {
  return (
    <div
      className="card animate-fade-in-up flex flex-col gap-2 p-5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <span
        className={`text-3xl font-bold tracking-tight ${
          valueClassName ?? "text-ink"
        }`}
      >
        {value}
      </span>
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </div>
  );
}

interface ActivityChartProps {
  buckets: { date: Date; label: string; count: number }[];
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
            : "bg-royal-100 hover:bg-royal-200";
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

function formatMedia(n: number): string {
  // 12 → "12"; 12.5 → "12,5"
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(".", ",");
}
