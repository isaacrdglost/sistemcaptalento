import { CalendarPlus, Layers, UserSearch, Users } from "lucide-react";
import type { Prisma, Senioridade } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { NovoTalentoModal } from "@/components/NovoTalentoModal";
import { TalentosFiltros } from "@/components/TalentosFiltros";
import { TalentoCard, type TalentoCardData } from "@/components/TalentoCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const SENIORIDADE_VALORES = [
  "estagio",
  "junior",
  "pleno",
  "senior",
  "especialista",
  "lideranca",
] as const satisfies readonly Senioridade[];

type SenioridadeValor = (typeof SENIORIDADE_VALORES)[number];

function normalizarParamString(
  valor: string | string[] | undefined,
): string | null {
  if (Array.isArray(valor)) return normalizarParamString(valor[0]);
  const v = (valor ?? "").trim();
  return v.length === 0 ? null : v;
}

function normalizarSenioridade(
  valor: string | string[] | undefined,
): SenioridadeValor | null {
  const v = normalizarParamString(valor);
  if (!v) return null;
  return (SENIORIDADE_VALORES as readonly string[]).includes(v)
    ? (v as SenioridadeValor)
    : null;
}

interface TalentosPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function TalentosPage({
  searchParams,
}: TalentosPageProps) {
  const session = await requireSession();

  const q = normalizarParamString(searchParams.q);
  const area = normalizarParamString(searchParams.area);
  const senioridade = normalizarSenioridade(searchParams.senioridade);
  const tag = normalizarParamString(searchParams.tag);
  const incluirArquivados =
    normalizarParamString(searchParams.incluirArquivados) === "1";

  const where: Prisma.TalentoWhereInput = {};

  if (!incluirArquivados) {
    where.ativo = true;
  }

  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { area: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  if (senioridade) {
    where.senioridade = senioridade;
  }

  if (area) {
    where.area = { equals: area, mode: "insensitive" };
  }

  if (tag) {
    where.tags = { has: tag };
  }

  const [talentos, areasRaw, totalAtivos, areasContagem, totalNoMes] =
    await Promise.all([
      prisma.talento.findMany({
        where,
        orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { candidatos: true } } },
      }),
      prisma.talento.findMany({
        where: { area: { not: null } },
        distinct: ["area"],
        select: { area: true },
        orderBy: { area: "asc" },
      }),
      prisma.talento.count({ where: { ativo: true } }),
      prisma.talento.groupBy({
        by: ["area"],
        where: { ativo: true, area: { not: null } },
        _count: { _all: true },
      }),
      (() => {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        return prisma.talento.count({
          where: { createdAt: { gte: inicioMes } },
        });
      })(),
    ]);

  const areasDisponiveis = areasRaw
    .map((t) => t.area)
    .filter((a): a is string => !!a && a.trim().length > 0);

  const cards: TalentoCardData[] = talentos.map((t) => ({
    id: t.id,
    nome: t.nome,
    email: t.email,
    senioridade: t.senioridade,
    area: t.area,
    cidade: t.cidade,
    estado: t.estado,
    tags: t.tags,
    linkCV: t.linkCV,
    cvArquivoUrl: t.cvArquivoUrl,
    linkedinUrl: t.linkedinUrl,
    ativo: t.ativo,
    createdAt: t.createdAt,
    candidatosCount: t._count.candidatos,
  }));

  const totalFiltros =
    (q ? 1 : 0) +
    (area ? 1 : 0) +
    (senioridade ? 1 : 0) +
    (tag ? 1 : 0) +
    (incluirArquivados ? 1 : 0);

  const topArea = [...areasContagem].sort(
    (a, b) => b._count._all - a._count._all,
  )[0];
  const topAreaLabel = topArea?.area ?? "—";
  const topAreaCount = topArea?._count?._all ?? 0;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Talentos" },
      ]}
    >
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="Pool"
          title="Banco de Talentos"
          subtitle="Profissionais cadastrados para consulta rápida em novas vagas."
          actions={<NovoTalentoModal />}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
          >
            <StatCard
              label="Talentos ativos"
              value={totalAtivos}
              icon={Users}
              tone="royal"
              size="sm"
            />
          </div>
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            <StatCard
              label="Top área"
              value={topAreaLabel}
              hint={
                topAreaCount > 0
                  ? `${topAreaCount} ${
                      topAreaCount === 1 ? "talento" : "talentos"
                    }`
                  : undefined
              }
              icon={Layers}
              tone="lima"
              size="sm"
            />
          </div>
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <StatCard
              label="Cadastrados este mês"
              value={totalNoMes}
              hint="desde o dia 1"
              icon={CalendarPlus}
              tone="amber"
              size="sm"
            />
          </div>
        </div>

        <TalentosFiltros
          initialQ={q ?? ""}
          initialArea={area ?? ""}
          initialSenioridade={senioridade ?? ""}
          initialTag={tag ?? ""}
          incluirArquivados={incluirArquivados}
          areas={areasDisponiveis}
          senioridades={[...SENIORIDADE_VALORES]}
        />

        {cards.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title="Nenhum talento encontrado"
            description={
              totalFiltros > 0
                ? "Nenhum talento bate com os filtros atuais. Limpe os filtros ou cadastre um novo."
                : "Comece a construir seu banco de talentos cadastrando o primeiro profissional."
            }
            action={
              <NovoTalentoModal triggerLabel="Cadastrar primeiro talento" />
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((t, i) => (
              <div
                key={t.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <TalentoCard talento={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
