import Link from "next/link";
import { Plus, Target } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { FollowupsPendentes } from "@/components/FollowupsPendentes";
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

export default async function ComercialPage({ searchParams }: PageProps) {
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

  const limiteParado = new Date();
  limiteParado.setDate(limiteParado.getDate() - 7);

  const agora = new Date();
  const hoje7DiasAtras = new Date(agora);
  hoje7DiasAtras.setDate(hoje7DiasAtras.getDate() - 7);
  hoje7DiasAtras.setHours(0, 0, 0, 0);
  const hoje3DiasAFrente = new Date(agora);
  hoje3DiasAFrente.setDate(hoje3DiasAFrente.getDate() + 3);
  hoje3DiasAFrente.setHours(23, 59, 59, 999);

  const where: Prisma.LeadWhereInput = {};
  if (tab === "meus") {
    where.responsavelId = userId;
  } else if (tab === "sem_responsavel") {
    where.responsavelId = null;
  }

  if (tab === "ganhos") {
    where.estagio = "ganho";
  } else if (tab === "perdidos") {
    where.estagio = "perdido";
  } else {
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
    followupsRaw,
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
    prisma.atividadeLead.findMany({
      where: {
        tipo: "followup_agendado",
        concluidoEm: null,
        agendadoPara: {
          gte: hoje7DiasAtras,
          lte: hoje3DiasAFrente,
        },
        OR: [
          { autorId: userId },
          { lead: { responsavelId: userId } },
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
  const tabFinalizada = tab === "ganhos" || tab === "perdidos";

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Vendas" }, { label: "CRM" }]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Vendas"
          title="CRM"
          subtitle="Pipeline de leads, caixa de entrada e follow-ups num só lugar."
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
            {followups.length > 0 ? (
              <div className="animate-fade-in-up">
                <FollowupsPendentes
                  followups={followups}
                  currentUserId={userId}
                />
              </div>
            ) : null}

            <BannerLeadsParados
              total={paradosTotal}
              exemplos={paradosItens}
            />

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
