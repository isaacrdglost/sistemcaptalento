import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  ShieldCheck,
  User,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import {
  aplicarVencimentosGarantia,
  diasRestantesGarantia,
  resumoStatusGarantia,
  toneGarantia,
} from "@/lib/garantia";
import { formatDateBR, formatRelative } from "@/lib/business-days";

interface PageProps {
  params: { id: string };
}

const MODELO_LABEL: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export default async function ContratacaoDetailPage({ params }: PageProps) {
  const session = await requireOperacional();
  const isAdmin = session.user.role === "admin";

  await aplicarVencimentosGarantia();

  const c = await prisma.contratacao.findUnique({
    where: { id: params.id },
    include: {
      candidato: {
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
        },
      },
      vaga: { select: { id: true, titulo: true } },
      cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      recrutadora: { select: { id: true, nome: true } },
    },
  });

  if (!c) notFound();
  if (!isAdmin && c.recrutadoraId !== session.user.id) notFound();

  const tone = toneGarantia(c.status, c.dataFimGarantia);
  const dias = diasRestantesGarantia(c.dataFimGarantia);
  const toneClasses: Record<typeof tone, string> = {
    lima: "border-lima-200 bg-lima-50 text-lima-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-line bg-slate-50 text-slate-600",
  };

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Trabalho" },
        { label: "Contratações", href: "/contratacoes" },
        { label: c.candidato.nome },
      ]}
    >
      <div className="container-app space-y-6">
        <Link
          href="/contratacoes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-ink"
        >
          <ArrowLeft size={14} />
          Voltar para contratações
        </Link>

        <PageHeader
          eyebrow="Contratação"
          title={c.candidato.nome}
          subtitle={`${c.cliente.razaoSocial} · ${c.vaga.titulo}`}
        />

        {/* Banner de status */}
        <div
          className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${toneClasses[tone]}`}
        >
          <ShieldCheck size={22} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {resumoStatusGarantia(c)}
            </div>
            <div className="text-lg font-semibold">
              {c.status === "em_garantia" && dias > 0
                ? `Garantia ativa · ${dias} dia${dias === 1 ? "" : "s"} restantes`
                : c.status === "em_garantia"
                  ? "Garantia vencendo"
                  : c.status === "garantia_ok"
                    ? "Garantia concluída sem incidente"
                    : c.status === "garantia_acionada"
                      ? "Garantia acionada — aguardando triagem"
                      : c.status === "reposto"
                        ? "Reposição concluída"
                        : "Contratação encerrada"}
            </div>
            <div className="mt-1 text-sm opacity-80">
              Admissão {formatDateBR(c.dataAdmissao)} · Garantia até{" "}
              {formatDateBR(c.dataFimGarantia)}
            </div>
          </div>
        </div>

        {c.status === "em_garantia" || c.status === "garantia_ok" ? (
          <div className="card flex items-start gap-3 border-amber-200 bg-amber-50/40 p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div className="text-sm text-amber-900">
              <div className="font-semibold">
                Acionamento e reposição vêm na próxima atualização.
              </div>
              <div className="mt-0.5 text-xs opacity-90">
                Por enquanto, registre o acionamento por fora se o cliente
                pedir reposição. A próxima fase do CRM trará o fluxo
                completo aqui.
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-5">
              <header className="mb-3 flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" />
                <h2 className="section-label">Termos congelados (snapshot)</h2>
              </header>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cargo
                  </dt>
                  <dd className="text-ink">{c.cargoSnapshot}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Salário / condições
                  </dt>
                  <dd className="text-ink">{c.salarioSnapshot}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Modelo
                  </dt>
                  <dd className="text-ink">
                    {MODELO_LABEL[c.modeloSnapshot] ?? c.modeloSnapshot}
                  </dd>
                </div>
                {c.escopoSnapshot ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Escopo
                    </dt>
                    <dd className="whitespace-pre-wrap text-ink">
                      {c.escopoSnapshot}
                    </dd>
                  </div>
                ) : null}
                {c.observacoesTermos ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Observações
                    </dt>
                    <dd className="whitespace-pre-wrap text-ink">
                      {c.observacoesTermos}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {c.admissaoEvidenciaUrl ? (
                <div className="mt-4 border-t border-line/70 pt-3">
                  <a
                    href={c.admissaoEvidenciaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                  >
                    <ExternalLink size={12} />
                    Ver evidência da admissão
                  </a>
                </div>
              ) : (
                <div className="mt-4 border-t border-line/70 pt-3 text-xs text-slate-500">
                  Nenhuma evidência da admissão anexada.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="card p-5">
              <h2 className="section-label mb-3">Pessoas e vínculos</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <User
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Candidato
                    </div>
                    <div className="font-semibold text-ink">
                      {c.candidato.nome}
                    </div>
                    {c.candidato.email ? (
                      <div className="text-xs text-slate-500">
                        {c.candidato.email}
                      </div>
                    ) : null}
                    {c.candidato.telefone ? (
                      <div className="text-xs text-slate-500">
                        {c.candidato.telefone}
                      </div>
                    ) : null}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Building2
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Cliente
                    </div>
                    <Link
                      href={`/clientes/${c.cliente.id}`}
                      className="font-semibold text-ink hover:text-royal"
                    >
                      {c.cliente.razaoSocial}
                    </Link>
                    {c.cliente.nomeFantasia ? (
                      <div className="text-xs text-slate-500">
                        {c.cliente.nomeFantasia}
                      </div>
                    ) : null}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Briefcase
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Vaga original
                    </div>
                    <Link
                      href={`/vagas/${c.vaga.id}`}
                      className="font-semibold text-ink hover:text-royal"
                    >
                      {c.vaga.titulo}
                    </Link>
                  </div>
                </li>
                {c.recrutadora ? (
                  <li className="flex items-start gap-2">
                    <Avatar nome={c.recrutadora.nome} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Recrutadora
                      </div>
                      <div className="font-semibold text-ink">
                        {c.recrutadora.nome}
                      </div>
                    </div>
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="section-label mb-2">Linha do tempo</h2>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <span className="font-semibold text-ink">
                    {formatDateBR(c.createdAt)}
                  </span>{" "}
                  · contratação registrada{" "}
                  <span className="text-slate-400">
                    ({formatRelative(c.createdAt)})
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    {formatDateBR(c.dataAdmissao)}
                  </span>{" "}
                  · admissão
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    {formatDateBR(c.dataFimGarantia)}
                  </span>{" "}
                  · {c.status === "em_garantia"
                    ? "fim previsto da garantia"
                    : "fim da garantia"}
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
