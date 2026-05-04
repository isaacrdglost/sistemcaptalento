import Link from "next/link";
import { Plus, Target } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  LeadFiltros,
  type LeadTab,
} from "@/components/LeadFiltros";
import { LeadList, type LeadRow } from "@/components/LeadList";
import { LeadsViewSwitcher } from "@/components/LeadsViewSwitcher";
import {
  BannerLeadsParados,
  type LeadParadoItem,
} from "@/components/BannerLeadsParados";
import { prisma } from "@/lib/prisma";
import { requireComercial } from "@/lib/session";

const ORIGENS_VALIDAS = new Set([
  "prospeccao_ativa",
  "indicacao",
  "site",
  "redes_sociais",
  "linkedin",
  "evento",
  "whatsapp",
  "outro",
]);

interface PageProps {
  searchParams?: {
    tab?: string;
    q?: string;
    origem?: string;
    tag?: string;
    stuck?: string;
    incluirArquivados?: string;
  };
}

function parseTab(raw: string | undefined, isAdmin: boolean): LeadTab {
  if (raw === "meus" || raw === "sem_responsavel") return raw;
  if (raw === "ganhos" || raw === "perdidos") return raw;
  if (raw === "todos" && isAdmin) return "todos";
  return isAdmin ? "todos" : "meus";
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const session = await requireComercial();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const tab = parseTab(searchParams?.tab, isAdmin);
  const q = (searchParams?.q ?? "").trim();
  const origemParam = (searchParams?.origem ?? "").trim();
  const origem = ORIGENS_VALIDAS.has(origemParam) ? origemParam : "";
  const tagParam = (searchParams?.tag ?? "").trim().slice(0, 40);
  const stuck = searchParams?.stuck === "1";
  const incluirArquivados = searchParams?.incluirArquivados === "1";

  // Limite de "parado" — sem update há mais de 7 dias
  const limiteParado = new Date();
  limiteParado.setDate(limiteParado.getDate() - 7);

  const where: Prisma.LeadWhereInput = {};
  if (tab === "meus") {
    where.responsavelId = userId;
  } else if (tab === "sem_responsavel") {
    where.responsavelId = null;
  } else if (tab === "todos") {
    // admin only — sem filtro de responsavel
  }

  // Filtro de estágio por aba
  if (tab === "ganhos") {
    where.estagio = "ganho";
  } else if (tab === "perdidos") {
    where.estagio = "perdido";
  } else {
    // meus/sem_responsavel/todos: oculta finalizados
    where.estagio = { notIn: ["ganho", "perdido"] };
  }

  if (!incluirArquivados) {
    where.arquivado = false;
  }

  if (origem) {
    where.origem = origem as Prisma.LeadWhereInput["origem"];
  }

  if (tagParam) {
    where.tags = { has: tagParam };
  }

  if (stuck) {
    where.updatedAt = { lt: limiteParado };
  }

  if (q.length > 0) {
    where.OR = [
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { nomeFantasia: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { contatoNome: { contains: q, mode: "insensitive" } },
    ];
  }

  const ativosNotIn: Prisma.LeadWhereInput = {
    estagio: { notIn: ["ganho", "perdido"] },
    arquivado: false,
  };

  // Filtro do banner: respeita visibilidade do usuário (admin vê todos,
  // comercial só os seus + sem responsável). Sempre considera apenas
  // estágios ativos e não arquivados.
  const paradosWhere: Prisma.LeadWhereInput = {
    estagio: { in: ["novo", "qualificado", "proposta", "negociacao"] },
    arquivado: false,
    updatedAt: { lt: limiteParado },
    ...(isAdmin
      ? {}
      : {
          OR: [{ responsavelId: userId }, { responsavelId: null }],
        }),
  };

  const [
    leads,
    totalGeral,
    countMeus,
    countSem,
    countTodos,
    countGanhos,
    countPerdidos,
    paradosExemplos,
    paradosTotal,
  ] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        responsavel: { select: { id: true, nome: true } },
      },
      take: 200,
    }),
    prisma.lead.count(),
    prisma.lead.count({
      where: { ...ativosNotIn, responsavelId: userId },
    }),
    prisma.lead.count({
      where: { ...ativosNotIn, responsavelId: null },
    }),
    prisma.lead.count({ where: ativosNotIn }),
    prisma.lead.count({
      where: isAdmin
        ? { estagio: "ganho" }
        : { estagio: "ganho", responsavelId: userId },
    }),
    prisma.lead.count({
      where: isAdmin
        ? { estagio: "perdido" }
        : { estagio: "perdido", responsavelId: userId },
    }),
    prisma.lead.findMany({
      where: paradosWhere,
      select: {
        id: true,
        razaoSocial: true,
        responsavel: { select: { id: true, nome: true } },
      },
      take: 6,
      orderBy: { updatedAt: "asc" },
    }),
    prisma.lead.count({ where: paradosWhere }),
  ]);

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    razaoSocial: l.razaoSocial,
    nomeFantasia: l.nomeFantasia,
    contatoNome: l.contatoNome,
    email: l.email,
    telefone: l.telefone,
    estagio: l.estagio,
    origem: l.origem,
    responsavelId: l.responsavelId,
    responsavel: l.responsavel
      ? { id: l.responsavel.id, nome: l.responsavel.nome }
      : null,
    arquivado: l.arquivado,
    tags: l.tags,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }));

  const paradosItens: LeadParadoItem[] = paradosExemplos.map((p) => ({
    id: p.id,
    razaoSocial: p.razaoSocial,
    responsavel: p.responsavel
      ? { id: p.responsavel.id, nome: p.responsavel.nome }
      : null,
  }));

  const hasAnyLead = totalGeral > 0;
  const tabFinalizada = tab === "ganhos" || tab === "perdidos";

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Vendas" }, { label: "Pipeline" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Pipeline"
          title="Leads"
          subtitle="Acompanhe os leads em prospecção, mova entre estágios e converta em clientes."
          actions={
            <Link href="/comercial/leads/novo" className="btn-primary">
              <Plus size={16} className="shrink-0" />
              <span>Novo lead</span>
            </Link>
          }
        />

        {!hasAnyLead ? (
          <EmptyState
            icon={Target}
            title="Nenhum lead cadastrado ainda"
            description="Cadastre um lead manualmente ou aguarde a primeira captura via formulário do site. A partir daí você organiza tudo aqui no pipeline."
            action={
              <Link href="/comercial/leads/novo" className="btn-primary">
                <Plus size={14} />
                Cadastrar primeiro lead
              </Link>
            }
          />
        ) : (
          <>
            <BannerLeadsParados
              total={paradosTotal}
              exemplos={paradosItens}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0ms" }}
              >
                <StatCard
                  label="Meus leads ativos"
                  value={countMeus}
                  hint="atribuídos a você"
                  tone="royal"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "60ms" }}
              >
                <StatCard
                  label="Sem responsável"
                  value={countSem}
                  hint="aguardando alguém pegar"
                  tone="amber"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "120ms" }}
              >
                <StatCard
                  label="Total no funil"
                  value={countTodos}
                  hint="ativos no pipeline"
                  tone="lima"
                  size="sm"
                />
              </div>
            </div>

            <LeadFiltros
              initialTab={tab}
              initialQ={q}
              initialOrigem={origem}
              initialTag={tagParam}
              initialStuck={stuck}
              incluirArquivados={incluirArquivados}
              isAdmin={isAdmin}
              counts={{
                meus: countMeus,
                semResponsavel: countSem,
                todos: countTodos,
                ganhos: countGanhos,
                perdidos: countPerdidos,
              }}
            />

            {rows.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Nenhum lead nesta visão"
                description="Ajuste os filtros ou troque de aba pra ver mais leads."
              />
            ) : (
              <LeadsViewSwitcher
                leads={rows}
                currentUserId={userId}
                isAdmin={isAdmin}
                toggleEnabled={!tabFinalizada}
                listSlot={
                  <LeadList
                    leads={rows}
                    currentUserId={userId}
                    isAdmin={isAdmin}
                    podeArquivar
                  />
                }
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
