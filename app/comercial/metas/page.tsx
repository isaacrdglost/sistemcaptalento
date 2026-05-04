import Link from "next/link";
import {
  Trophy,
  Sparkles,
  TrendingUp,
  Target,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireComercial } from "@/lib/session";
import { formatDateBR, formatRelative } from "@/lib/business-days";

/**
 * Painel de metas comerciais. Métrica central do MVP: nº de leads
 * convertidos em cliente no mês (estagio=ganho com dataGanho no mês).
 *
 * - Comercial vê apenas seus próprios números + comparação MoM
 * - Admin vê o ranking do time inteiro
 */
export default async function MetasPage() {
  const session = await requireComercial();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  // Janelas de tempo — mês corrente e mês anterior pra comparação
  const agora = new Date();
  const inicioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const inicioMesAnterior = new Date(
    agora.getFullYear(),
    agora.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );

  // Filtro por usuário — comercial só vê os próprios; admin vê tudo (mas a
  // tela individual desse admin também mostra os números pessoais dele)
  const escopoMeu = { responsavelId: userId };

  const [
    ganhosMes,
    ganhosMesAnterior,
    perdidosMes,
    leadsAtivos,
    ultimosGanhos,
    rankingMes, // só usado se isAdmin
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        ...escopoMeu,
        estagio: "ganho",
        dataGanho: { gte: inicioMes },
      },
    }),
    prisma.lead.count({
      where: {
        ...escopoMeu,
        estagio: "ganho",
        dataGanho: { gte: inicioMesAnterior, lt: inicioMes },
      },
    }),
    prisma.lead.count({
      where: {
        ...escopoMeu,
        estagio: "perdido",
        dataPerda: { gte: inicioMes },
      },
    }),
    prisma.lead.count({
      where: {
        ...escopoMeu,
        estagio: { notIn: ["ganho", "perdido"] },
        arquivado: false,
      },
    }),
    prisma.lead.findMany({
      where: {
        ...escopoMeu,
        estagio: "ganho",
        dataGanho: { gte: inicioMes },
      },
      orderBy: { dataGanho: "desc" },
      take: 8,
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
      },
    }),
    isAdmin
      ? prisma.lead.findMany({
          where: {
            estagio: "ganho",
            dataGanho: { gte: inicioMes },
          },
          select: {
            responsavelId: true,
            responsavel: { select: { id: true, nome: true } },
          },
        })
      : Promise.resolve(
          [] as { responsavelId: string | null; responsavel: { id: string; nome: string } | null }[],
        ),
  ]);

  // Taxa de conversão: ganhos / (ganhos + perdidos) — finalizados do mês
  const finalizadosMes = ganhosMes + perdidosMes;
  const taxaConversao =
    finalizadosMes > 0
      ? Math.round((ganhosMes / finalizadosMes) * 100)
      : null;

  // Variação Month-over-Month (%)
  const deltaMoM = (() => {
    if (ganhosMesAnterior === 0) {
      return ganhosMes > 0 ? { dir: "up" as const, label: "novo" } : null;
    }
    const pct = Math.round(
      ((ganhosMes - ganhosMesAnterior) / ganhosMesAnterior) * 100,
    );
    if (pct === 0) return { dir: "neutral" as const, label: "0%" };
    return {
      dir: pct > 0 ? ("up" as const) : ("down" as const),
      label: `${pct > 0 ? "+" : ""}${pct}%`,
    };
  })();

  // Ranking pra admin: agrupa por responsável e ordena
  const ranking = isAdmin
    ? Array.from(
        rankingMes.reduce<
          Map<string, { id: string; nome: string; count: number }>
        >((acc, item) => {
          if (!item.responsavel) return acc;
          const existing = acc.get(item.responsavel.id);
          if (existing) {
            existing.count += 1;
          } else {
            acc.set(item.responsavel.id, {
              id: item.responsavel.id,
              nome: item.responsavel.nome,
              count: 1,
            });
          }
          return acc;
        }, new Map()),
      )
        .map(([, v]) => v)
        .sort((a, b) => b.count - a.count)
    : [];

  const nomeMesCorrente = agora
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Vendas" }, { label: "Metas" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Metas"
          title={`Acompanhamento — ${nomeMesCorrente}`}
          subtitle={
            isAdmin
              ? "Seus números pessoais + ranking de conversão do time."
              : "Quantos leads você converteu em clientes este mês."
          }
        />

        {ganhosMes === 0 && leadsAtivos === 0 && perdidosMes === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Sem dados de metas ainda"
            description="Quando você começar a fechar leads ganhos, eles vão aparecer aqui com sua taxa de conversão e o ranking do time."
            action={
              <Link href="/comercial/leads/novo" className="btn-primary">
                Cadastrar primeiro lead
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0ms" }}
              >
                <StatCard
                  label="Ganhos no mês"
                  value={ganhosMes}
                  hint={
                    deltaMoM
                      ? `vs ${ganhosMesAnterior} no mês passado`
                      : "sem comparação"
                  }
                  trend={
                    deltaMoM
                      ? {
                          direction: deltaMoM.dir,
                          value: deltaMoM.label,
                        }
                      : undefined
                  }
                  icon={Sparkles}
                  tone="lima"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "60ms" }}
              >
                <StatCard
                  label="Taxa de conversão"
                  value={taxaConversao === null ? "—" : `${taxaConversao}%`}
                  hint={
                    taxaConversao === null
                      ? "sem leads finalizados ainda"
                      : `${ganhosMes} de ${finalizadosMes} fechados`
                  }
                  icon={TrendingUp}
                  tone="royal"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "120ms" }}
              >
                <StatCard
                  label="Perdidos no mês"
                  value={perdidosMes}
                  hint="cancelaram ou viraram não"
                  icon={ArrowDownRight}
                  tone={perdidosMes > 0 ? "red" : "slate"}
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                <StatCard
                  label="Leads ativos"
                  value={leadsAtivos}
                  hint="ainda no funil"
                  icon={Target}
                  tone="amber"
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Últimos ganhos */}
              <section
                className={`card p-5 animate-fade-in-up ${
                  isAdmin ? "" : "lg:col-span-3"
                } ${isAdmin ? "lg:col-span-2" : ""}`}
                style={{ animationDelay: "240ms" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="section-label mb-1">Conversões</div>
                    <h2 className="text-h3 text-ink">
                      Últimos ganhos do mês
                    </h2>
                  </div>
                  <Link
                    href="/comercial/leads?tab=ganhos"
                    className="text-xs font-semibold text-royal transition hover:text-royal-700"
                  >
                    Ver todos →
                  </Link>
                </div>
                {ultimosGanhos.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum lead ganho neste mês ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {ultimosGanhos.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/comercial/leads/${g.id}`}
                            className="block truncate text-sm font-semibold text-ink hover:text-royal"
                          >
                            {g.razaoSocial}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {g.dataGanho ? (
                              <>
                                Ganho em {formatDateBR(g.dataGanho)} ·{" "}
                                {formatRelative(g.dataGanho)}
                              </>
                            ) : (
                              "—"
                            )}
                          </div>
                        </div>
                        {g.cliente && (
                          <Link
                            href={`/clientes/${g.cliente.id}`}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-lima-700 transition hover:text-lima-600"
                          >
                            Cliente
                            <ArrowUpRight size={12} />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Ranking — só pra admin */}
              {isAdmin && (
                <section
                  className="card p-5 animate-fade-in-up"
                  style={{ animationDelay: "300ms" }}
                >
                  <div className="mb-4">
                    <div className="section-label mb-1">Ranking</div>
                    <h2 className="text-h3 text-ink">Time comercial</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Conversões deste mês
                    </p>
                  </div>
                  {ranking.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhuma conversão ainda este mês.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {ranking.map((r, idx) => {
                        const max = ranking[0]?.count ?? 1;
                        const pct = Math.round((r.count / max) * 100);
                        return (
                          <li key={r.id} className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-700"
                                  : idx === 1
                                    ? "bg-slate-200 text-slate-700"
                                    : idx === 2
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-slate-100 text-slate-500"
                              }`}
                              title={`${idx + 1}º lugar`}
                            >
                              {idx + 1}
                            </span>
                            <Avatar nome={r.nome} size="xs" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-ink">
                                {r.nome}
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/70">
                                <div
                                  className="h-full rounded-full bg-gradient-royal transition-[width] duration-500 ease-smooth"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-ink">
                              {r.count}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
