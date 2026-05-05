import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Hourglass,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import type { Prisma, ProtocoloStatus } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import { formatDateBR } from "@/lib/business-days";
import {
  PROTOCOLO_STATUS_LABEL,
  PROTOCOLO_STATUS_TONE,
} from "@/lib/protocolos";

type Tab = "ativos" | "aguardando" | "ativadas" | "finalizados" | "todos";

interface PageProps {
  searchParams?: { tab?: string };
}

const TAB_DEFS: { value: Tab; label: string }[] = [
  { value: "ativos", label: "Em curso" },
  { value: "aguardando", label: "Aguardando cliente" },
  { value: "ativadas", label: "Garantia ativa" },
  { value: "finalizados", label: "Finalizados" },
  { value: "todos", label: "Todos" },
];

function parseTab(raw: string | undefined): Tab {
  if (
    raw === "aguardando" ||
    raw === "ativadas" ||
    raw === "finalizados" ||
    raw === "todos"
  )
    return raw;
  return "ativos";
}

function statusFilter(tab: Tab): Prisma.ProtocoloReposicaoWhereInput {
  if (tab === "ativos") {
    return {
      status: { in: ["aberto", "aguardando_cliente", "ativada"] },
    };
  }
  if (tab === "aguardando") return { status: "aguardando_cliente" };
  if (tab === "ativadas") return { status: "ativada" };
  if (tab === "finalizados") {
    return { status: { in: ["reposto", "encerrado"] } };
  }
  return {};
}

export default async function ReposicoesPage({ searchParams }: PageProps) {
  const session = await requireOperacional();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const tab = parseTab(searchParams?.tab);

  const visibilidade: Prisma.ProtocoloReposicaoWhereInput = isAdmin
    ? {}
    : { recrutadoraId: userId };

  const where: Prisma.ProtocoloReposicaoWhereInput = {
    ...visibilidade,
    ...statusFilter(tab),
  };

  const [
    protocolos,
    totalGeral,
    countAtivos,
    countAguardando,
    countAtivadas,
    countFinalizados,
  ] = await Promise.all([
    prisma.protocoloReposicao.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        vaga: { select: { id: true, titulo: true } },
        cliente: { select: { id: true, razaoSocial: true } },
        recrutadora: { select: { id: true, nome: true } },
      },
      take: 200,
    }),
    prisma.protocoloReposicao.count({ where: visibilidade }),
    prisma.protocoloReposicao.count({
      where: {
        ...visibilidade,
        status: { in: ["aberto", "aguardando_cliente", "ativada"] },
      },
    }),
    prisma.protocoloReposicao.count({
      where: { ...visibilidade, status: "aguardando_cliente" },
    }),
    prisma.protocoloReposicao.count({
      where: { ...visibilidade, status: "ativada" },
    }),
    prisma.protocoloReposicao.count({
      where: { ...visibilidade, status: { in: ["reposto", "encerrado"] } },
    }),
  ]);

  const counts: Record<Tab, number> = {
    ativos: countAtivos,
    aguardando: countAguardando,
    ativadas: countAtivadas,
    finalizados: countFinalizados,
    todos: totalGeral,
  };

  const hasAny = totalGeral > 0;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Trabalho" }, { label: "Reposições" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Trabalho"
          title="Protocolos de reposição"
          subtitle="Acompanhe os pedidos de reposição abertos e o histórico do que já fechou."
        />

        {!hasAny ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum protocolo aberto"
            description="Quando o cliente pedir reposição em alguma vaga com garantia, o protocolo aparece aqui."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Em curso"
                value={countAtivos}
                hint="aberto / aguardando / ativada"
                icon={FileCheck2}
                tone="amber"
                size="sm"
              />
              <StatCard
                label="Aguardando cliente"
                value={countAguardando}
                hint="precisa confirmar"
                icon={Hourglass}
                tone="slate"
                size="sm"
              />
              <StatCard
                label="Garantias ativas"
                value={countAtivadas}
                hint="cliente confirmou"
                icon={ShieldCheck}
                tone="lima"
                size="sm"
              />
              <StatCard
                label="Finalizados"
                value={countFinalizados}
                hint="reposto ou encerrado"
                icon={CheckCircle2}
                tone="royal"
                size="sm"
              />
            </div>

            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-fit">
              {TAB_DEFS.map((t) => {
                const ativo = tab === t.value;
                return (
                  <Link
                    key={t.value}
                    href={`/reposicoes?tab=${t.value}`}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      ativo
                        ? "bg-white text-ink shadow-xs"
                        : "text-slate-500 hover:text-ink"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-xs text-slate-400">
                      {counts[t.value]}
                    </span>
                  </Link>
                );
              })}
            </div>

            {protocolos.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="Nada nessa visão"
                description="Tente outra aba pra ver mais protocolos."
              />
            ) : (
              <ProtocolosTable rows={protocolos} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

interface RowData {
  id: string;
  status: ProtocoloStatus;
  profissionalSaiuNome: string;
  dataSaida: Date;
  vaga: { id: string; titulo: string };
  cliente: { id: string; razaoSocial: string };
  recrutadora: { id: string; nome: string } | null;
}

function ProtocolosTable({ rows }: { rows: RowData[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <ul className="divide-y divide-line/70">
        {rows.map((r) => {
          const tone = PROTOCOLO_STATUS_TONE[r.status];
          const Icon = STATUS_ICON[r.status];
          return (
            <li key={r.id}>
              <Link
                href={`/vagas/${r.vaga.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <Icon size={16} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.profissionalSaiuNome}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
                    >
                      {PROTOCOLO_STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {r.cliente.razaoSocial} · {r.vaga.titulo} · saída{" "}
                    {formatDateBR(r.dataSaida)}
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

const STATUS_ICON: Record<
  ProtocoloStatus,
  typeof ShieldCheck
> = {
  aberto: FileCheck2,
  aguardando_cliente: Hourglass,
  ativada: ShieldCheck,
  reposto: CheckCircle2,
  encerrado: ShieldX,
};
