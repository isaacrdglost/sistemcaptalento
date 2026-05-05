import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarRange,
  Clock,
  PlusCircle,
  Target,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { computeAdminMetrics } from "@/lib/metrics";
import { computeVagaDerived } from "@/lib/flows";
import { AppShell } from "@/components/shell/AppShell";
import { VagaCard, type VagaWithRecrutador } from "@/components/VagaCard";
import { AdminMetrics } from "@/components/AdminMetrics";
import { RecrutadorFilter } from "@/components/RecrutadorFilter";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProtocolosAtivosWidget } from "@/components/ProtocolosAtivosWidget";

interface DashboardPageProps {
  searchParams?: { rec?: string };
}

function saudacao(hora: number): string {
  if (hora < 5) return "Boa noite";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDataExtenso(d: Date): string {
  const txt = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function formatMedia(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(".", ",");
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requireSession();
  const isAdmin = session.user.role === "admin";
  const now = new Date();

  const recFilter = isAdmin ? searchParams?.rec : undefined;

  // Dashboard mostra apenas vagas em andamento (encerrada=false). Histórico
  // completo fica em /vagas.
  const where = {
    encerrada: false,
    ...(isAdmin
      ? recFilter
        ? { recrutadorId: recFilter }
        : {}
      : { recrutadorId: session.user.id }),
  };

  const vagas = (await prisma.vaga.findMany({
    where,
    include: {
      recrutador: { select: { id: true, nome: true } },
      _count: { select: { candidatos: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  })) as VagaWithRecrutador[];

  // Para métricas admin e contagens por recrutador, usamos todas as vagas (sem filtro).
  const todasVagas = isAdmin
    ? ((await prisma.vaga.findMany({
        include: {
          recrutador: { select: { id: true, nome: true } },
          _count: { select: { candidatos: true } },
        },
      })) as VagaWithRecrutador[])
    : [];

  const recrutadores = isAdmin
    ? await prisma.user.findMany({
        where: { role: "recruiter", ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      })
    : [];

  // Conta vagas ativas por recrutador para enriquecer o filtro.
  const ativasPorRecrutador = new Map<string, number>();
  let totalAtivasGlobal = 0;
  for (const v of todasVagas) {
    if (v.encerrada) continue;
    totalAtivasGlobal++;
    const id = v.recrutador?.id;
    if (!id) continue;
    ativasPorRecrutador.set(id, (ativasPorRecrutador.get(id) ?? 0) + 1);
  }
  const recrutadoresComCount = recrutadores.map((r) => ({
    ...r,
    count: ativasPorRecrutador.get(r.id) ?? 0,
  }));

  // Vagas com alertas (em risco) — usa derived
  const vagasEmRisco: VagaWithRecrutador[] = [];
  let minhasVagasAtivas = 0;
  let minhasEmAtraso = 0;
  let minhasMarcosSemana = 0;
  const proximosSeteDias = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 7);
    return d;
  })();

  for (const v of vagas) {
    const d = computeVagaDerived(v, now);
    const temAlerta =
      !v.encerrada &&
      (d.alertas.length > 0 ||
        (d.diasRestantesPrazo !== null && d.diasRestantesPrazo < 0));
    if (temAlerta) vagasEmRisco.push(v);

    if (!v.encerrada) {
      minhasVagasAtivas++;
      if (
        d.alertas.length > 0 ||
        (d.diasRestantesPrazo !== null && d.diasRestantesPrazo < 0)
      ) {
        minhasEmAtraso++;
      }
      for (const m of d.marcos) {
        if (m.status === "done") continue;
        if (
          m.dataPrevista &&
          m.dataPrevista.getTime() <= proximosSeteDias.getTime()
        ) {
          minhasMarcosSemana++;
        }
      }
    }
  }

  const adminMetrics = isAdmin
    ? computeAdminMetrics(todasVagas, now)
    : null;

  const protocolosVisibilidade = isAdmin
    ? {}
    : { recrutadoraId: session.user.id };
  const [protocolosAtivosRaw, totalProtocolosAtivos, totalAguardando] =
    await Promise.all([
      prisma.protocoloReposicao.findMany({
        where: {
          ...protocolosVisibilidade,
          status: { in: ["aberto", "aguardando_cliente", "ativada"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          profissionalSaiuNome: true,
          dataSaida: true,
          vaga: { select: { id: true, titulo: true } },
          cliente: { select: { razaoSocial: true } },
        },
      }),
      prisma.protocoloReposicao.count({
        where: {
          ...protocolosVisibilidade,
          status: { in: ["aberto", "aguardando_cliente", "ativada"] },
        },
      }),
      prisma.protocoloReposicao.count({
        where: { ...protocolosVisibilidade, status: "aguardando_cliente" },
      }),
    ]);

  const nome = (session.user.name ?? "").split(" ")[0] || "colega";
  const greeting = saudacao(now.getHours());
  const dataLabel = formatDataExtenso(now);

  const ativasVisiveis = vagas.filter((v) => !v.encerrada).length;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="container-app flex flex-col gap-8">
        {/* HERO */}
        <section className="animate-fade-in-up">
          <p className="mb-2 text-xs text-slate-400">{dataLabel}</p>
          <div className="card-hero p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="section-label mb-2">
                  {greeting}, {nome}
                </div>
                <h1 className="text-display text-ink text-balance">
                  {ativasVisiveis === 0
                    ? "Nenhuma vaga ativa no momento."
                    : `Você tem ${ativasVisiveis} ${
                        ativasVisiveis === 1
                          ? "vaga ativa"
                          : "vagas ativas"
                      }${
                        vagasEmRisco.length > 0
                          ? `, ${vagasEmRisco.length} ${
                              vagasEmRisco.length === 1
                                ? "com alerta"
                                : "com alertas"
                            } hoje.`
                          : "."
                      }`}
                </h1>
                <p className="mt-2 text-sm text-slate-500 text-pretty">
                  {vagasEmRisco.length > 0
                    ? "Comece pelas vagas em risco — depois siga para os marcos da semana."
                    : "Tudo no prumo. Boas decisões de hoje viram fechamentos amanhã."}
                </p>
              </div>
              <Link
                href="/vagas/nova"
                className="btn-primary btn-lg shrink-0"
              >
                <PlusCircle size={16} />
                Nova vaga
              </Link>
            </div>
          </div>
        </section>

        {/* KPIs */}
        {isAdmin && adminMetrics ? (
          <section
            className="grid animate-fade-in-up grid-cols-2 gap-4 md:grid-cols-4"
            style={{ animationDelay: "60ms" }}
          >
            <StatCard
              label="Vagas ativas"
              value={adminMetrics.ativas}
              icon={Briefcase}
              tone="royal"
              hint={
                adminMetrics.criadasUltimos30d === 1
                  ? "1 criada nos últimos 30d"
                  : `${adminMetrics.criadasUltimos30d} criadas nos últimos 30d`
              }
            />
            <StatCard
              label="Em atraso"
              value={adminMetrics.emAtraso}
              icon={AlertTriangle}
              tone={adminMetrics.emAtraso > 0 ? "red" : "slate"}
              hint={
                adminMetrics.emAtraso === 0
                  ? "Nenhuma vaga com alertas"
                  : adminMetrics.emAtraso === 1
                    ? "1 vaga exige atenção"
                    : `${adminMetrics.emAtraso} vagas exigem atenção`
              }
            />
            <StatCard
              label="Shortlists no mês"
              value={adminMetrics.shortlistsMes}
              icon={Target}
              tone="lima"
              hint="Entregues desde o dia 1"
            />
            <StatCard
              label="Tempo médio até shortlist"
              value={
                adminMetrics.tempoMedioShortlistDiasUteis === null
                  ? "— d"
                  : `${formatMedia(
                      adminMetrics.tempoMedioShortlistDiasUteis,
                    )} d`
              }
              icon={Clock}
              tone="royal"
              hint={
                adminMetrics.tempoMedioShortlistDiasUteis === null
                  ? "Sem entregas suficientes"
                  : "Média em dias úteis"
              }
            />
          </section>
        ) : (
          <section
            className="grid animate-fade-in-up grid-cols-1 gap-4 md:grid-cols-3"
            style={{ animationDelay: "60ms" }}
          >
            <StatCard
              label="Minhas vagas ativas"
              value={minhasVagasAtivas}
              icon={Briefcase}
              tone="royal"
              hint={
                minhasVagasAtivas === 0
                  ? "Nenhuma vaga em andamento"
                  : "Em andamento agora"
              }
            />
            <StatCard
              label="Próximos marcos esta semana"
              value={minhasMarcosSemana}
              icon={CalendarRange}
              tone="lima"
              hint="Vencem nos próximos 7 dias"
            />
            <StatCard
              label="Em atraso"
              value={minhasEmAtraso}
              icon={AlertTriangle}
              tone={minhasEmAtraso > 0 ? "red" : "slate"}
              hint={
                minhasEmAtraso === 0
                  ? "Tudo no prazo"
                  : minhasEmAtraso === 1
                    ? "1 vaga exige atenção"
                    : `${minhasEmAtraso} vagas exigem atenção`
              }
            />
          </section>
        )}

        {/* Painel admin: gráfico + top recrutadoras */}
        {isAdmin && adminMetrics ? (
          <AdminMetrics
            buckets30d={adminMetrics.buckets30d}
            maxBucket={adminMetrics.maxBucket}
            criadasUltimos30d={adminMetrics.criadasUltimos30d}
            topRecrutadores={adminMetrics.topRecrutadores}
          />
        ) : null}

        {/* Protocolos de reposição em curso */}
        {totalProtocolosAtivos > 0 ? (
          <ProtocolosAtivosWidget
            protocolos={protocolosAtivosRaw.map((p) => ({
              id: p.id,
              status: p.status,
              profissionalNome: p.profissionalSaiuNome,
              vagaId: p.vaga.id,
              vagaTitulo: p.vaga.titulo,
              clienteRazaoSocial: p.cliente.razaoSocial,
              dataSaida: p.dataSaida,
            }))}
            total={totalProtocolosAtivos}
            aguardando={totalAguardando}
          />
        ) : null}

        {/* Vagas em risco */}
        {vagasEmRisco.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="section-label">Atenção necessária</span>
              <span className="text-xs text-slate-400">
                · {vagasEmRisco.length}{" "}
                {vagasEmRisco.length === 1 ? "vaga" : "vagas"}
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {vagasEmRisco.map((v, i) => (
                <div
                  key={v.id}
                  className="animate-fade-in-up rounded-2xl border-l-4 border-red-300"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <VagaCard vaga={v} showRecrutador={isAdmin} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Vagas em andamento */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="section-label">Vagas em andamento</span>
            {isAdmin ? (
              <RecrutadorFilter
                recrutadores={recrutadoresComCount}
                current={recFilter}
                totalAtivas={totalAtivasGlobal}
              />
            ) : null}
          </div>

          {vagas.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={
                isAdmin
                  ? "Nenhuma vaga no portfólio ainda"
                  : "Nenhuma vaga por aqui ainda"
              }
              description="Quando você abrir uma vaga, ela aparecerá aqui com prazos, marcos e alertas do fluxo."
              action={
                <Link href="/vagas/nova" className="btn-primary">
                  <PlusCircle size={16} />
                  Abrir primeira vaga
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {vagas.map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    animationDelay: `${Math.min(i, 12) * 30}ms`,
                  }}
                  className="animate-fade-in-up"
                >
                  <VagaCard vaga={v} showRecrutador={isAdmin} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
