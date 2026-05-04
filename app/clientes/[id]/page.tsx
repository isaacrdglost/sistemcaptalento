import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ClienteInfoForm } from "@/components/ClienteInfoForm";
import { FluxoBadge } from "@/components/FluxoBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCNPJ } from "@/lib/format";
import { formatDateBR } from "@/lib/business-days";

interface PageProps {
  params: { id: string };
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const session = await requireSession();

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: {
      vagas: {
        include: {
          recrutador: { select: { id: true, nome: true } },
          _count: { select: { candidatos: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cliente) notFound();

  const vagasAbertas = cliente.vagas.filter((v) => !v.encerrada).length;
  const vagasEncerradas = cliente.vagas.filter((v) => v.encerrada).length;

  const subtitle =
    cliente.nomeFantasia ??
    (cliente.cnpj ? `CNPJ ${formatCNPJ(cliente.cnpj)}` : undefined);

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        session.user.role === "comercial"
          ? { label: "Vendas", href: "/comercial" }
          : { label: "Dashboard", href: "/dashboard" },
        { label: "Clientes", href: "/clientes" },
        { label: cliente.razaoSocial },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <Avatar
              nome={cliente.razaoSocial}
              size="xl"
              gradient={cliente.ativo}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {cliente.ativo ? (
                  <span className="badge-green">Ativo</span>
                ) : (
                  <span className="badge-slate">Arquivado</span>
                )}
                {vagasAbertas > 0 ? (
                  <span className="badge-lima">
                    {vagasAbertas === 1
                      ? "1 vaga aberta"
                      : `${vagasAbertas} vagas abertas`}
                  </span>
                ) : null}
              </div>
              <PageHeader
                eyebrow="Cliente"
                title={cliente.razaoSocial}
                subtitle={subtitle}
                actions={
                  <Link
                    href={`/vagas/nova?clienteId=${cliente.id}`}
                    className="btn-primary"
                  >
                    <PlusCircle size={16} className="shrink-0" />
                    <span>Nova vaga com este cliente</span>
                  </Link>
                }
              />
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <StatCard
            label="Total de vagas"
            value={cliente.vagas.length}
            tone="royal"
            size="sm"
          />
          <StatCard
            label="Ativas"
            value={vagasAbertas}
            tone="lima"
            size="sm"
          />
          <StatCard
            label="Encerradas"
            value={vagasEncerradas}
            tone="slate"
            size="sm"
          />
          <StatCard
            label="Cadastrado em"
            value={formatDateBR(cliente.createdAt)}
            tone="amber"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section
            className="card p-6 lg:col-span-2 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="section-label mb-1">Histórico</div>
                <h2 className="text-h3 text-ink">Vagas deste cliente</h2>
                <p className="text-sm text-slate-500">
                  {cliente.vagas.length === 0
                    ? "Nenhuma vaga associada ainda"
                    : `${cliente.vagas.length} ${
                        cliente.vagas.length === 1 ? "vaga" : "vagas"
                      } no histórico`}
                </p>
              </div>
              {cliente.vagas.length > 0 ? (
                <Link
                  href={`/vagas/nova?clienteId=${cliente.id}`}
                  className="btn-secondary"
                >
                  <Plus size={16} className="shrink-0" />
                  <span>Nova vaga</span>
                </Link>
              ) : null}
            </div>

            {cliente.vagas.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line/70 bg-slate-50/50 p-10 text-center">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Nenhuma vaga cadastrada para este cliente ainda
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Crie a primeira vaga já associada a este cliente.
                  </p>
                </div>
                <Link
                  href={`/vagas/nova?clienteId=${cliente.id}`}
                  className="btn-primary"
                >
                  <Plus size={16} className="shrink-0" />
                  <span>Nova vaga com este cliente</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line/70">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-left text-eyebrow uppercase text-slate-500 border-b border-line/70">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Título</th>
                      <th className="px-4 py-2.5 font-semibold">Fluxo</th>
                      <th className="px-4 py-2.5 font-semibold">Recrutadora</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Briefing</th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 bg-white">
                    {cliente.vagas.map((vaga) => (
                      <tr
                        key={vaga.id}
                        className="group transition hover:bg-slate-50/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">
                            {vaga.titulo}
                          </div>
                          <div className="text-xs text-slate-500">
                            {vaga._count.candidatos}{" "}
                            {vaga._count.candidatos === 1
                              ? "candidato"
                              : "candidatos"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <FluxoBadge fluxo={vaga.fluxo} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {vaga.recrutador?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {vaga.encerrada ? (
                            <span className="badge-dot bg-slate-100 text-slate-600 ring-slate-200">
                              Encerrada
                            </span>
                          ) : (
                            <span className="badge-dot bg-emerald-50 text-emerald-700 ring-emerald-100">
                              Ativa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateBR(vaga.dataBriefing)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/vagas/${vaga.id}`}
                            className="inline-flex items-center gap-0.5 text-sm font-semibold text-royal transition hover:text-royal-700"
                          >
                            Abrir
                            <ChevronRight
                              size={14}
                              className="transition-transform group-hover:translate-x-0.5"
                            />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside
            className="animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <ClienteInfoForm cliente={cliente} role={session.user.role} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
