import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ClienteInfoForm } from "@/components/ClienteInfoForm";
import { FluxoBadge } from "@/components/FluxoBadge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCNPJ, getInitials } from "@/lib/format";
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

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clientes", href: "/clientes" },
        { label: cliente.razaoSocial },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-3 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-pop ${
                cliente.ativo
                  ? "bg-gradient-royal text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
              aria-hidden
            >
              {getInitials(cliente.razaoSocial)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
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
              <h1 className="mt-1 text-2xl font-bold text-ink">
                {cliente.razaoSocial}
              </h1>
              {cliente.nomeFantasia ? (
                <p className="text-sm text-slate-500">{cliente.nomeFantasia}</p>
              ) : null}
              {cliente.cnpj ? (
                <p className="mt-1 text-xs text-slate-500">
                  CNPJ {formatCNPJ(cliente.cnpj)}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Vagas deste cliente</h2>
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
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
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
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Título</th>
                      <th className="px-4 py-2">Fluxo</th>
                      <th className="px-4 py-2">Recrutadora</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Briefing</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cliente.vagas.map((vaga) => (
                      <tr key={vaga.id} className="hover:bg-slate-50/60">
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
                            <span className="badge-slate">Encerrada</span>
                          ) : (
                            <span className="badge-royal">Ativa</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateBR(vaga.dataBriefing)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/vagas/${vaga.id}`}
                            className="text-sm font-semibold text-royal hover:underline"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside>
            <ClienteInfoForm cliente={cliente} role={session.user.role} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
