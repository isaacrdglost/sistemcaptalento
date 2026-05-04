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

  const [contratacoes, totalGeral, countVigentes, countAcionadas, countEncerradas] =
    await Promise.all([
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
    ]);

  const hasAny = totalGeral > 0;

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
