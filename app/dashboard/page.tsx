import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/shell/AppShell";
import { VagaCard, type VagaWithRecrutador } from "@/components/VagaCard";
import { AdminMetrics } from "@/components/AdminMetrics";
import { RecrutadorFilter } from "@/components/RecrutadorFilter";

interface DashboardPageProps {
  searchParams?: { rec?: string };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requireSession();
  const isAdmin = session.user.role === "admin";

  const recFilter = isAdmin ? searchParams?.rec : undefined;

  const where = isAdmin
    ? recFilter
      ? { recrutadorId: recFilter }
      : {}
    : { recrutadorId: session.user.id };

  const vagas = (await prisma.vaga.findMany({
    where,
    include: {
      recrutador: { select: { id: true, nome: true } },
      _count: { select: { candidatos: true } },
    },
    orderBy: [{ encerrada: "asc" }, { createdAt: "desc" }],
  })) as VagaWithRecrutador[];

  const recrutadores = isAdmin
    ? await prisma.user.findMany({
        where: { role: "recruiter", ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      })
    : [];

  // Para métricas admin, usamos todas as vagas (sem filtro aplicado).
  const vagasParaMetricas = isAdmin
    ? ((await prisma.vaga.findMany({
        include: {
          recrutador: { select: { id: true, nome: true } },
          _count: { select: { candidatos: true } },
        },
      })) as VagaWithRecrutador[])
    : [];

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Olá, {(session.user.name ?? "").split(" ")[0] || "colega"}
            </h1>
            <p className="text-sm text-slate-500">
              O que precisa sair hoje.
            </p>
          </div>
          <Link href="/vagas/nova" className="btn-primary">
            + Nova vaga
          </Link>
        </div>

        {isAdmin ? (
          <div className="mb-8 flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Visão geral — todo o portfólio
                </h2>
              </div>
              <AdminMetrics vagas={vagasParaMetricas} />
            </div>
            <RecrutadorFilter
              recrutadores={recrutadores}
              current={recFilter}
            />
          </div>
        ) : null}

        {vagas.length === 0 ? (
          <EmptyDashboard isAdmin={isAdmin} />
        ) : (
          <div className="grid animate-fade-in-up gap-5 md:grid-cols-2 xl:grid-cols-3">
            {vagas.map((v, i) => (
              <div
                key={v.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-fade-in-up"
              >
                <VagaCard vaga={v} showRecrutador={isAdmin} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyDashboard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-royal text-xl font-bold text-white shadow-pop">
        +
      </div>
      <div>
        <h2 className="text-lg font-bold text-ink">
          {isAdmin
            ? "Nenhuma vaga no portfólio ainda"
            : "Nenhuma vaga por aqui ainda"}
        </h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Quando você abrir uma vaga, ela aparecerá aqui com prazos, marcos e
          alertas do fluxo.
        </p>
      </div>
      <Link href="/vagas/nova" className="btn-primary">
        Abrir primeira vaga
      </Link>
    </div>
  );
}
