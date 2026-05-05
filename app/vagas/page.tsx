import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import { fluxoLabel } from "@/lib/flows";
import { formatDateBR } from "@/lib/business-days";

type StatusFiltro = "todas" | "ativas" | "encerradas";

interface PageProps {
  searchParams?: {
    q?: string;
    status?: string;
    rec?: string;
    cliente?: string;
  };
}

const STATUS_DEFS: { value: StatusFiltro; label: string }[] = [
  { value: "ativas", label: "Em andamento" },
  { value: "encerradas", label: "Encerradas" },
  { value: "todas", label: "Todas" },
];

function parseStatus(raw: string | undefined): StatusFiltro {
  if (raw === "todas" || raw === "encerradas") return raw;
  return "ativas";
}

export default async function VagasListPage({ searchParams }: PageProps) {
  const session = await requireOperacional();
  const isAdmin = session.user.role === "admin";

  const status = parseStatus(searchParams?.status);
  const q = (searchParams?.q ?? "").trim();
  const rec = (searchParams?.rec ?? "").trim();
  const clienteFiltro = (searchParams?.cliente ?? "").trim();

  const where: Prisma.VagaWhereInput = {};
  if (!isAdmin) {
    where.recrutadorId = session.user.id;
  } else if (rec) {
    where.recrutadorId = rec;
  }
  if (status === "ativas") where.encerrada = false;
  else if (status === "encerradas") where.encerrada = true;

  if (clienteFiltro) where.clienteId = clienteFiltro;

  if (q.length > 0) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { cliente: { contains: q, mode: "insensitive" } },
      { area: { contains: q, mode: "insensitive" } },
      { localizacao: { contains: q, mode: "insensitive" } },
    ];
  }

  const [
    vagas,
    countAtivas,
    countEncerradas,
    recrutadores,
    clientes,
  ] = await Promise.all([
    prisma.vaga.findMany({
      where,
      orderBy: [{ encerrada: "asc" }, { dataBriefing: "desc" }],
      include: {
        recrutador: { select: { id: true, nome: true } },
        clienteRef: { select: { id: true, razaoSocial: true } },
        _count: { select: { candidatos: true } },
      },
      take: 500,
    }),
    prisma.vaga.count({
      where: {
        encerrada: false,
        ...(isAdmin ? {} : { recrutadorId: session.user.id }),
      },
    }),
    prisma.vaga.count({
      where: {
        encerrada: true,
        ...(isAdmin ? {} : { recrutadorId: session.user.id }),
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: "recruiter", ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  const totalGeral = countAtivas + countEncerradas;
  const hasAny = totalGeral > 0;

  const counts = {
    ativas: countAtivas,
    encerradas: countEncerradas,
    todas: totalGeral,
  };

  function buildHref(next: Partial<{ status: StatusFiltro; q: string; rec: string; cliente: string }>): string {
    const params = new URLSearchParams();
    const finalStatus = next.status ?? status;
    if (finalStatus !== "ativas") params.set("status", finalStatus);
    const finalQ = next.q ?? q;
    if (finalQ) params.set("q", finalQ);
    const finalRec = next.rec ?? rec;
    if (finalRec) params.set("rec", finalRec);
    const finalCliente = next.cliente ?? clienteFiltro;
    if (finalCliente) params.set("cliente", finalCliente);
    const qs = params.toString();
    return qs ? `/vagas?${qs}` : "/vagas";
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Trabalho" }, { label: "Vagas" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Trabalho"
          title="Todas as vagas"
          subtitle="Lista completa do histórico — em andamento e encerradas. Filtre, busque, exporte mentalmente."
          actions={
            <Link href="/vagas/nova" className="btn-primary">
              <Plus size={16} className="shrink-0" />
              <span>Nova vaga</span>
            </Link>
          }
        />

        {!hasAny ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhuma vaga ainda"
            description="Cadastre a primeira vaga pra começar a popular o histórico."
            action={
              <Link href="/vagas/nova" className="btn-primary">
                <Plus size={14} />
                Cadastrar vaga
              </Link>
            }
          />
        ) : (
          <>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/vagas">
              <input type="hidden" name="status" value={status} />
              {rec ? <input type="hidden" name="rec" value={rec} /> : null}
              {clienteFiltro ? (
                <input type="hidden" name="cliente" value={clienteFiltro} />
              ) : null}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar por título, cliente, área…"
                  className="input pl-9"
                />
              </div>
              <button type="submit" className="btn-secondary text-sm">
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {STATUS_DEFS.map((s) => {
                  const ativo = status === s.value;
                  return (
                    <Link
                      key={s.value}
                      href={buildHref({ status: s.value })}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        ativo
                          ? "bg-white text-ink shadow-xs"
                          : "text-slate-500 hover:text-ink"
                      }`}
                    >
                      {s.label}
                      <span className="ml-1.5 text-xs text-slate-400">
                        {counts[s.value]}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {clientes.length > 0 ? (
                <ClienteFilterDropdown
                  current={clienteFiltro}
                  clientes={clientes}
                  buildHref={buildHref}
                />
              ) : null}

              {isAdmin && recrutadores.length > 0 ? (
                <RecrutadoraFilterDropdown
                  current={rec}
                  recrutadoras={recrutadores}
                  buildHref={buildHref}
                />
              ) : null}

              {(q || rec || clienteFiltro) && (
                <Link
                  href={buildHref({ q: "", rec: "", cliente: "" })}
                  className="text-xs font-semibold text-slate-500 hover:text-ink"
                >
                  Limpar filtros
                </Link>
              )}
            </div>

            {vagas.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Nada nessa visão"
                description="Ajuste os filtros pra ver mais."
              />
            ) : (
              <VagasTable rows={vagas} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

interface VagaRow {
  id: string;
  titulo: string;
  cliente: string;
  clienteRef: { id: string; razaoSocial: string } | null;
  recrutador: { id: string; nome: string };
  fluxo: "padrao" | "rapido";
  encerrada: boolean;
  temGarantia: boolean;
  area: string | null;
  localizacao: string | null;
  dataBriefing: Date;
  dataPrazo: Date | null;
  dataShortlistEntregue: Date | null;
  dataEncerramento: Date | null;
  shortlistEntregue: boolean;
  _count: { candidatos: number };
}

function VagasTable({ rows }: { rows: VagaRow[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line/70 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-semibold">Vaga</th>
              <th className="px-3 py-2 font-semibold">Cliente</th>
              <th className="px-3 py-2 font-semibold">Recrutadora</th>
              <th className="px-3 py-2 font-semibold">Fluxo</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Candidatos</th>
              <th className="px-3 py-2 font-semibold">Briefing</th>
              <th className="px-3 py-2 font-semibold">Shortlist</th>
              <th className="px-3 py-2 font-semibold">Prazo / Encerrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr
                key={v.id}
                className="border-b border-line/70 transition last:border-0 hover:bg-slate-50/60"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/vagas/${v.id}`}
                    className="block font-semibold text-ink hover:text-royal"
                  >
                    {v.titulo}
                  </Link>
                  {(v.area || v.localizacao) && (
                    <div className="text-xs text-slate-500">
                      {[v.area, v.localizacao].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-ink">
                  {v.clienteRef?.razaoSocial ?? v.cliente}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <Avatar nome={v.recrutador.nome} size="xs" />
                    <span className="truncate">{v.recrutador.nome}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {fluxoLabel(v.fluxo)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                        v.encerrada
                          ? "bg-slate-100 text-slate-600 ring-slate-200"
                          : "bg-emerald-100 text-emerald-700 ring-emerald-200"
                      }`}
                    >
                      {v.encerrada ? "Encerrada" : "Ativa"}
                    </span>
                    {v.temGarantia && (
                      <span
                        title="Vaga com garantia de reposição"
                        className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-lima-100 px-2 py-0.5 text-[11px] font-semibold text-lima-700 ring-1 ring-inset ring-lima-200"
                      >
                        <ShieldCheck size={10} />
                        Garantia
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-ink">{v._count.candidatos}</td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatDateBR(v.dataBriefing)}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {v.dataShortlistEntregue
                    ? formatDateBR(v.dataShortlistEntregue)
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {v.encerrada
                    ? v.dataEncerramento
                      ? formatDateBR(v.dataEncerramento)
                      : "—"
                    : v.dataPrazo
                      ? formatDateBR(v.dataPrazo)
                      : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClienteFilterDropdown({
  current,
  clientes,
  buildHref,
}: {
  current: string;
  clientes: { id: string; razaoSocial: string }[];
  buildHref: (next: Partial<{ status: StatusFiltro; q: string; rec: string; cliente: string }>) => string;
}) {
  const atual = clientes.find((c) => c.id === current);
  return (
    <details className="relative">
      <summary className="btn-secondary cursor-pointer select-none text-xs">
        Cliente: {atual?.razaoSocial ?? "Todos"}
      </summary>
      <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-line/70 bg-white p-1 shadow-lg">
        <Link
          href={buildHref({ cliente: "" })}
          className={`block rounded-lg px-3 py-2 text-sm transition ${
            !current ? "bg-royal-50 text-royal-700" : "hover:bg-slate-50"
          }`}
        >
          Todos
        </Link>
        {clientes.map((c) => (
          <Link
            key={c.id}
            href={buildHref({ cliente: c.id })}
            className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
              current === c.id
                ? "bg-royal-50 text-royal-700"
                : "hover:bg-slate-50"
            }`}
          >
            {c.razaoSocial}
          </Link>
        ))}
      </div>
    </details>
  );
}

function RecrutadoraFilterDropdown({
  current,
  recrutadoras,
  buildHref,
}: {
  current: string;
  recrutadoras: { id: string; nome: string }[];
  buildHref: (next: Partial<{ status: StatusFiltro; q: string; rec: string; cliente: string }>) => string;
}) {
  const atual = recrutadoras.find((r) => r.id === current);
  return (
    <details className="relative">
      <summary className="btn-secondary cursor-pointer select-none text-xs">
        Recrutadora: {atual?.nome ?? "Todas"}
      </summary>
      <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-line/70 bg-white p-1 shadow-lg">
        <Link
          href={buildHref({ rec: "" })}
          className={`block rounded-lg px-3 py-2 text-sm transition ${
            !current ? "bg-royal-50 text-royal-700" : "hover:bg-slate-50"
          }`}
        >
          Todas
        </Link>
        {recrutadoras.map((r) => (
          <Link
            key={r.id}
            href={buildHref({ rec: r.id })}
            className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
              current === r.id
                ? "bg-royal-50 text-royal-700"
                : "hover:bg-slate-50"
            }`}
          >
            {r.nome}
          </Link>
        ))}
      </div>
    </details>
  );
}
