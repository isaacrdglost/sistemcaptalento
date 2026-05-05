import Link from "next/link";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Prisma, StatusContratacao } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import {
  aplicarVencimentosGarantia,
  diasRestantesGarantia,
  resumoStatusGarantia,
  toneGarantia,
} from "@/lib/garantia";
import { formatDateBR } from "@/lib/business-days";

type Tab = "vigentes" | "acionadas" | "encerradas" | "todas";

interface PageProps {
  searchParams?: { tab?: string };
}

const TAB_DEFS: { value: Tab; label: string }[] = [
  { value: "vigentes", label: "Em garantia" },
  { value: "acionadas", label: "Acionadas" },
  { value: "encerradas", label: "Encerradas" },
  { value: "todas", label: "Todas" },
];

function parseTab(raw: string | undefined): Tab {
  if (raw === "acionadas" || raw === "encerradas" || raw === "todas")
    return raw;
  return "vigentes";
}

function whereForTab(tab: Tab, isAdmin: boolean, userId: string): Prisma.ContratacaoWhereInput {
  const visibilidade: Prisma.ContratacaoWhereInput = isAdmin
    ? {}
    : { recrutadoraId: userId };

  if (tab === "vigentes") {
    return { ...visibilidade, status: "em_garantia" };
  }
  if (tab === "acionadas") {
    return { ...visibilidade, status: "garantia_acionada" };
  }
  if (tab === "encerradas") {
    return {
      ...visibilidade,
      status: { in: ["garantia_ok", "reposto", "encerrado"] satisfies StatusContratacao[] },
    };
  }
  return visibilidade;
}

export default async function ContratacoesPage({ searchParams }: PageProps) {
  const session = await requireOperacional();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const tab = parseTab(searchParams?.tab);

  // Lazy update: vira garantia_ok quem já passou do prazo.
  await aplicarVencimentosGarantia();

  const visibilidade: Prisma.ContratacaoWhereInput = isAdmin
    ? {}
    : { recrutadoraId: userId };

  // Janela de 90 dias pra métricas
  const noventaDiasAtras = new Date();
  noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

  const [
    contratacoes,
    totalGeral,
    countVigentes,
    countAcionadas,
    countEncerradas,
    metrics90d,
    acionadas90d,
  ] = await Promise.all([
      prisma.contratacao.findMany({
        where: whereForTab(tab, isAdmin, userId),
        orderBy: [{ dataFimGarantia: "asc" }],
        include: {
          candidato: { select: { id: true, nome: true } },
          vaga: { select: { id: true, titulo: true } },
          cliente: { select: { id: true, razaoSocial: true } },
          recrutadora: { select: { id: true, nome: true } },
        },
        take: 200,
      }),
      prisma.contratacao.count({ where: visibilidade }),
      prisma.contratacao.count({
        where: { ...visibilidade, status: "em_garantia" },
      }),
      prisma.contratacao.count({
        where: { ...visibilidade, status: "garantia_acionada" },
      }),
      prisma.contratacao.count({
        where: {
          ...visibilidade,
          status: { in: ["garantia_ok", "reposto", "encerrado"] },
        },
      }),
      prisma.contratacao.findMany({
        where: { ...visibilidade, createdAt: { gte: noventaDiasAtras } },
        select: { status: true, dataAdmissao: true, dataSaida: true },
      }),
      prisma.contratacao.findMany({
        where: {
          ...visibilidade,
          status: "garantia_acionada",
          dataSaida: { not: null },
        },
        select: { motivoSaida: true, saidaDentroGarantia: true },
        take: 200,
      }),
    ]);

  const hasAny = totalGeral > 0;

  // Métricas dos últimos 90 dias
  const total90d = metrics90d.length;
  const acionadas90dCount = metrics90d.filter(
    (m) => m.status === "garantia_acionada" || m.status === "reposto",
  ).length;
  const taxaAcionamento =
    total90d > 0 ? Math.round((acionadas90dCount / total90d) * 100) : null;

  const tempoMedio = (() => {
    const diffs = metrics90d
      .filter((m) => m.dataSaida && m.dataAdmissao)
      .map((m) => {
        const ms = m.dataSaida!.getTime() - m.dataAdmissao.getTime();
        return ms / (1000 * 60 * 60 * 24);
      });
    if (diffs.length === 0) return null;
    return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  })();

  const motivoMaisComum = (() => {
    if (acionadas90d.length === 0) return null;
    const tally = new Map<string, number>();
    for (const a of acionadas90d) {
      if (a.motivoSaida) {
        tally.set(a.motivoSaida, (tally.get(a.motivoSaida) ?? 0) + 1);
      }
    }
    if (tally.size === 0) return null;
    const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]![0];
  })();

  const taxaDentro = (() => {
    const triadas = acionadas90d.filter((a) => a.saidaDentroGarantia !== null);
    if (triadas.length === 0) return null;
    const dentro = triadas.filter((a) => a.saidaDentroGarantia === true).length;
    return Math.round((dentro / triadas.length) * 100);
  })();

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Trabalho" }, { label: "Contratações" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Trabalho"
          title="Contratações"
          subtitle="Acompanhe a garantia de 30 dias após cada admissão e reposições em curso."
        />

        {!hasAny ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhuma contratação registrada"
            description="Quando você marcar um candidato como contratado, ele aparece aqui com o countdown da garantia."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard
                label="Em garantia"
                value={countVigentes}
                hint="dentro dos 30d"
                icon={ShieldCheck}
                tone="lima"
                size="sm"
              />
              <StatCard
                label="Acionadas"
                value={countAcionadas}
                hint="precisam de triagem ou reposição"
                icon={AlertCircle}
                tone="red"
                size="sm"
              />
              <StatCard
                label="Encerradas"
                value={countEncerradas}
                hint="garantia OK, reposta ou encerrada"
                icon={CheckCircle2}
                tone="slate"
                size="sm"
              />
            </div>

            {total90d > 0 ? (
              <section className="card p-5">
                <header className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="section-label">Últimos 90 dias</div>
                    <h2 className="text-h3 text-ink">
                      Saúde do portfólio
                    </h2>
                  </div>
                </header>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricMini
                    label="Taxa de acionamento"
                    value={taxaAcionamento === null ? "—" : `${taxaAcionamento}%`}
                    hint={`${acionadas90dCount} de ${total90d} contratações`}
                  />
                  <MetricMini
                    label="Tempo até saída"
                    value={tempoMedio === null ? "—" : `${tempoMedio} d`}
                    hint="média de dias da admissão"
                  />
                  <MetricMini
                    label="Motivo mais comum"
                    value={
                      motivoMaisComum === null
                        ? "—"
                        : MOTIVO_LABEL[motivoMaisComum] ?? motivoMaisComum
                    }
                  />
                  <MetricMini
                    label="Triadas dentro"
                    value={taxaDentro === null ? "—" : `${taxaDentro}%`}
                    hint="da garantia (após triagem)"
                  />
                </div>
              </section>
            ) : null}

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-full sm:w-fit">
              {TAB_DEFS.map((t) => {
                const active = tab === t.value;
                return (
                  <Link
                    key={t.value}
                    href={`/contratacoes?tab=${t.value}`}
                    className={`flex-1 sm:flex-none rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
                      active
                        ? "bg-white text-ink shadow-xs"
                        : "text-slate-500 hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>

            {contratacoes.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Nada nessa visão"
                description="Tente outra aba pra ver mais contratações."
              />
            ) : (
              <ContratacaoTable rows={contratacoes} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

interface RowData {
  id: string;
  status: StatusContratacao;
  dataAdmissao: Date;
  dataFimGarantia: Date;
  candidato: { id: string; nome: string };
  vaga: { id: string; titulo: string };
  cliente: { id: string; razaoSocial: string };
  recrutadora: { id: string; nome: string } | null;
}

const MOTIVO_LABEL: Record<string, string> = {
  pedido_cliente: "Pedido do cliente",
  pedido_candidato: "Pedido do candidato",
  acordo_mutuo: "Acordo mútuo",
  inadequacao_tecnica: "Inadequação técnica",
  inadequacao_comportamental: "Inadequação comportamental",
  reestruturacao_cliente: "Reestruturação do cliente",
  mudanca_escopo: "Mudança de escopo",
  falha_onboarding_cliente: "Falha de onboarding",
  outro: "Outro",
};

function MetricMini({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function ContratacaoTable({ rows }: { rows: RowData[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <ul className="divide-y divide-line/70">
        {rows.map((r) => {
          const tone = toneGarantia(r.status, r.dataFimGarantia);
          const dias = diasRestantesGarantia(r.dataFimGarantia);
          const toneClasses: Record<typeof tone, string> = {
            lima: "bg-lima-100 text-lima-700 ring-lima-200",
            amber: "bg-amber-100 text-amber-700 ring-amber-200",
            red: "bg-red-100 text-red-700 ring-red-200",
            slate: "bg-slate-100 text-slate-600 ring-slate-200",
          };
          return (
            <li key={r.id}>
              <Link
                href={`/contratacoes/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <ShieldCheck
                  size={16}
                  className="shrink-0 text-slate-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.candidato.nome}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${toneClasses[tone]}`}
                    >
                      {r.status === "em_garantia" && dias > 0
                        ? `${dias}d restantes`
                        : resumoStatusGarantia(r)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {r.cliente.razaoSocial} · {r.vaga.titulo} · admissão{" "}
                    {formatDateBR(r.dataAdmissao)}
                  </div>
                </div>
                {r.recrutadora ? (
                  <Avatar nome={r.recrutadora.nome} size="xs" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
