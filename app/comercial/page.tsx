import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Hourglass,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { ComercialPegarLeadButton } from "@/components/ComercialPegarLeadButton";
import { FollowupsPendentes } from "@/components/FollowupsPendentes";
import { prisma } from "@/lib/prisma";
import { requireComercial } from "@/lib/session";
import { descricaoEstagioLead } from "@/lib/activity-lead";
import { formatRelative } from "@/lib/business-days";

export default async function ComercialPage() {
  const session = await requireComercial();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const agora = new Date();
  const hoje7DiasAtras = new Date(agora);
  hoje7DiasAtras.setDate(hoje7DiasAtras.getDate() - 7);
  hoje7DiasAtras.setHours(0, 0, 0, 0);
  const hoje3DiasAFrente = new Date(agora);
  hoje3DiasAFrente.setDate(hoje3DiasAFrente.getDate() + 3);
  hoje3DiasAFrente.setHours(23, 59, 59, 999);

  const [
    countNovos,
    countQualificados,
    countProposta,
    countNegociacao,
    countSemResponsavel,
    countMesCriados,
    totalGeral,
    leadsRecentes,
    leadsSemResponsavel,
    followupsRaw,
  ] = await Promise.all([
    prisma.lead.count({ where: { estagio: "novo", arquivado: false } }),
    prisma.lead.count({
      where: { estagio: "qualificado", arquivado: false },
    }),
    prisma.lead.count({ where: { estagio: "proposta", arquivado: false } }),
    prisma.lead.count({
      where: { estagio: "negociacao", arquivado: false },
    }),
    prisma.lead.count({
      where: { responsavelId: null, arquivado: false },
    }),
    prisma.lead.count({ where: { createdAt: { gte: inicioMes } } }),
    prisma.lead.count(),
    prisma.lead.findMany({
      where: { arquivado: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { responsavel: { select: { id: true, nome: true } } },
    }),
    prisma.lead.findMany({
      where: { responsavelId: null, arquivado: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.atividadeLead.findMany({
      where: {
        tipo: "followup_agendado",
        concluidoEm: null,
        agendadoPara: {
          gte: hoje7DiasAtras,
          lte: hoje3DiasAFrente,
        },
        OR: [
          { autorId: session.user.id },
          { lead: { responsavelId: session.user.id } },
        ],
      },
      include: {
        lead: { select: { id: true, razaoSocial: true } },
        autor: { select: { id: true, nome: true } },
      },
      orderBy: { agendadoPara: "asc" },
      take: 20,
    }),
  ]);

  const followups = followupsRaw
    .filter((f) => f.agendadoPara !== null)
    .map((f) => ({
      id: f.id,
      leadId: f.lead.id,
      leadRazaoSocial: f.lead.razaoSocial,
      descricao: f.descricao,
      agendadoPara: f.agendadoPara as Date,
      autor: f.autor,
    }));

  const hasAnyLead = totalGeral > 0;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Vendas" }, { label: "Painel" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Vendas"
          title="Painel comercial"
          subtitle="Visão geral do funil, leads sem responsável e o que entrou no mês."
          actions={
            <Link href="/comercial/leads/novo" className="btn-primary">
              <Plus size={16} className="shrink-0" />
              <span>Novo lead</span>
            </Link>
          }
        />

        {!hasAnyLead ? (
          <EmptyState
            icon={Sparkles}
            title="Comece pelo primeiro lead"
            description="Cadastre uma oportunidade que entrou no radar comercial. A partir daí o painel ganha vida com métricas e follow-ups."
            action={
              <Link href="/comercial/leads/novo" className="btn-primary">
                <Plus size={14} />
                Cadastrar primeiro lead
              </Link>
            }
          />
        ) : (
          <>
            {followups.length > 0 ? (
              <div className="animate-fade-in-up">
                <FollowupsPendentes
                  followups={followups}
                  currentUserId={session.user.id}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0ms" }}
              >
                <StatCard
                  label="Novos"
                  value={countNovos}
                  hint="aguardando triagem"
                  icon={Target}
                  tone="slate"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "60ms" }}
              >
                <StatCard
                  label="Qualificados"
                  value={countQualificados}
                  hint="prontos pra avançar"
                  icon={CheckCircle2}
                  tone="royal"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "120ms" }}
              >
                <StatCard
                  label="Em proposta"
                  value={countProposta}
                  hint="aguardando retorno"
                  icon={Hourglass}
                  tone="amber"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                <StatCard
                  label="Em negociação"
                  value={countNegociacao}
                  hint="quase fechando"
                  icon={TrendingUp}
                  tone="lima"
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="section-label mb-1">Caixa de entrada</div>
                  <div className="text-2xl font-bold text-ink">
                    {countSemResponsavel}
                  </div>
                  <p className="text-xs text-slate-500">
                    leads sem responsável aguardando alguém pegar
                  </p>
                </div>
                <Link
                  href="/comercial/leads?tab=sem_responsavel"
                  className="btn-secondary text-xs"
                >
                  Ver caixa
                  <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="section-label mb-1">Entrada no mês</div>
                  <div className="text-2xl font-bold text-ink">
                    {countMesCriados}
                  </div>
                  <p className="text-xs text-slate-500">
                    leads criados desde o dia 1
                  </p>
                </div>
                <Link
                  href="/comercial/leads"
                  className="btn-secondary text-xs"
                >
                  Ver pipeline
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="section-label mb-1">Recentes</div>
                    <h2 className="text-h3 text-ink">
                      Últimos leads cadastrados
                    </h2>
                  </div>
                  <Link
                    href="/comercial/leads"
                    className="text-xs font-semibold text-royal transition hover:text-royal-700"
                  >
                    Ver tudo →
                  </Link>
                </div>
                {leadsRecentes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum lead recente.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {leadsRecentes.map((lead, i) => (
                      <li
                        key={lead.id}
                        className="animate-fade-in-up py-2.5"
                        style={{
                          animationDelay: `${Math.min(i, 6) * 30}ms`,
                        }}
                      >
                        <Link
                          href={`/comercial/leads/${lead.id}`}
                          className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink">
                              {lead.razaoSocial}
                            </div>
                            <div className="text-xs text-slate-500">
                              {descricaoEstagioLead(lead.estagio)} ·{" "}
                              {formatRelative(lead.createdAt)}
                            </div>
                          </div>
                          {lead.responsavel ? (
                            <Avatar
                              nome={lead.responsavel.nome}
                              size="xs"
                            />
                          ) : (
                            <span className="text-[10px] uppercase text-slate-400">
                              Sem dono
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="section-label mb-1">Caixa de entrada</div>
                    <h2 className="text-h3 text-ink">Sem responsável</h2>
                  </div>
                  <Link
                    href="/comercial/leads?tab=sem_responsavel"
                    className="text-xs font-semibold text-royal transition hover:text-royal-700"
                  >
                    Ver tudo →
                  </Link>
                </div>
                {leadsSemResponsavel.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum lead aguardando responsável. Bom trabalho!
                  </p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {leadsSemResponsavel.map((lead, i) => (
                      <li
                        key={lead.id}
                        className="animate-fade-in-up flex items-center justify-between gap-3 py-2.5"
                        style={{
                          animationDelay: `${Math.min(i, 6) * 30}ms`,
                        }}
                      >
                        <Link
                          href={`/comercial/leads/${lead.id}`}
                          className="min-w-0 flex-1"
                        >
                          <div className="truncate text-sm font-semibold text-ink transition hover:text-royal">
                            {lead.razaoSocial}
                          </div>
                          <div className="text-xs text-slate-500">
                            {descricaoEstagioLead(lead.estagio)} ·{" "}
                            {formatRelative(lead.createdAt)}
                          </div>
                        </Link>
                        <ComercialPegarLeadButton leadId={lead.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
