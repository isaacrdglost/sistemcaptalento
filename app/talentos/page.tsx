import { UserSearch } from "lucide-react";
import type { Prisma, Senioridade } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { NovoTalentoModal } from "@/components/NovoTalentoModal";
import { TalentosFiltros } from "@/components/TalentosFiltros";
import { TalentoCard, type TalentoCardData } from "@/components/TalentoCard";
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

  const [talentos, areasRaw] = await Promise.all([
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
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Banco de Talentos
            </h1>
            <p className="text-sm text-slate-500">
              Profissionais cadastrados para consulta rápida em novas vagas.
            </p>
          </div>
          <NovoTalentoModal />
        </div>

        <div className="mb-6">
          <TalentosFiltros
            initialQ={q ?? ""}
            initialArea={area ?? ""}
            initialSenioridade={senioridade ?? ""}
            initialTag={tag ?? ""}
            incluirArquivados={incluirArquivados}
            areas={areasDisponiveis}
            senioridades={[...SENIORIDADE_VALORES]}
          />
        </div>

        {cards.length === 0 ? (
          <EmptyTalentos hasFilters={totalFiltros > 0} />
        ) : (
          <div className="grid animate-fade-in-up gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((t) => (
              <TalentoCard key={t.id} talento={t} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyTalentos({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-12 text-center animate-fade-in-up">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-royal-50 text-royal">
        <UserSearch size={28} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-ink">Nenhum talento encontrado</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {hasFilters
            ? "Nenhum talento bate com os filtros atuais. Limpe os filtros ou cadastre um novo."
            : "Comece a construir seu banco de talentos cadastrando o primeiro profissional."}
        </p>
      </div>
      <NovoTalentoModal triggerLabel="Cadastrar primeiro talento" />
    </div>
  );
}
