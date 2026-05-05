import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { CheckInsCard, type CheckInItem } from "@/components/CheckInsCard";
import { TermoButton } from "@/components/TermoButton";
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

const MOTIVO_LABEL: Record<string, string> = {
  pedido_cliente: "Pedido do cliente",
  pedido_candidato: "Pedido do candidato",
  acordo_mutuo: "Acordo mútuo",
  inadequacao_tecnica: "Inadequação técnica",
  inadequacao_comportamental: "Inadequação comportamental",
  reestruturacao_cliente: "Reestruturação do cliente",
  mudanca_escopo: "Mudança de escopo",
  falha_onboarding_cliente: "Falha de onboarding do cliente",
  outro: "Outro",
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
      vagaReposicao: { select: { id: true, titulo: true } },
      cliente: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          emailPrincipal: true,
        },
      },
      recrutadora: { select: { id: true, nome: true } },
      triadoPor: { select: { id: true, nome: true } },
      checkIns: {
        orderBy: { diasApos: "asc" },
        include: { autor: { select: { nome: true } } },
      },
    },
  });

  if (!c) notFound();
  if (!isAdmin && c.recrutadoraId !== session.user.id) notFound();

  const checkIns: CheckInItem[] = c.checkIns.map((ci) => ({
    id: ci.id,
    diasApos: ci.diasApos,
    agendadoPara: ci.agendadoPara,
    realizadoEm: ci.realizadoEm,
    resultado: ci.resultado,
    observacao: ci.observacao,
    autorNome: ci.autor?.nome ?? null,
  }));

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

        <div className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/40 p-3 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            Auditoria
          </span>
          <span>
            Esta página é o histórico do protocolo. As ações (registrar
            contratação, abrir protocolo, concluir reposição) acontecem no{" "}
            <Link
              href={`/vagas/${c.vaga.id}`}
              className="font-semibold text-royal hover:underline"
            >
              detalhe da vaga
            </Link>
            .
          </span>
        </div>

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
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/70 pt-3 text-xs">
                {c.admissaoEvidenciaUrl ? (
                  <a
                    href={c.admissaoEvidenciaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
                  >
                    <ExternalLink size={12} />
                    Ver evidência da admissão
                  </a>
                ) : (
                  <span className="text-slate-500">
                    Nenhuma evidência da admissão anexada.
                  </span>
                )}
                <TermoButton
                  contratacaoId={c.id}
                  clienteEmail={c.cliente.emailPrincipal}
                />
              </div>
            </section>

            {(c.status === "garantia_acionada" ||
              c.status === "reposto" ||
              c.status === "encerrado") &&
            c.dataSaida ? (
              <section className="card border-amber-200 bg-amber-50/30 p-5">
                <h2 className="section-label mb-3 text-amber-800">
                  Saída e triagem
                </h2>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Data da saída
                    </dt>
                    <dd className="text-ink">{formatDateBR(c.dataSaida)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Motivo declarado
                    </dt>
                    <dd className="text-ink">
                      {MOTIVO_LABEL[c.motivoSaida ?? "outro"]}
                    </dd>
                  </div>
                  {c.motivoSaidaDetalhe ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Detalhe
                      </dt>
                      <dd className="whitespace-pre-wrap text-ink">
                        {c.motivoSaidaDetalhe}
                      </dd>
                    </div>
                  ) : null}
                  {c.saidaDentroGarantia !== null ? (
                    <div className="sm:col-span-2 border-t border-amber-200 pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Triagem
                      </dt>
                      <dd className="text-ink">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                            c.saidaDentroGarantia
                              ? "bg-lima-100 text-lima-700 ring-lima-200"
                              : "bg-red-100 text-red-700 ring-red-200"
                          }`}
                        >
                          {c.saidaDentroGarantia
                            ? "Dentro da garantia"
                            : "Fora da garantia"}
                        </span>
                        {c.triadoPor ? (
                          <span className="ml-2 text-xs text-slate-500">
                            por {c.triadoPor.nome}
                            {c.triadoEm
                              ? ` em ${formatDateBR(c.triadoEm)}`
                              : ""}
                          </span>
                        ) : null}
                        {c.saidaDentroGarantiaJustif ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                            {c.saidaDentroGarantiaJustif}
                          </p>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {c.vagaReposicao ? (
                  <div className="mt-4 rounded-lg border border-royal-200 bg-royal-50/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-royal-700">
                      Reposição
                    </p>
                    <Link
                      href={`/vagas/${c.vagaReposicao.id}`}
                      className="text-sm font-semibold text-royal hover:underline"
                    >
                      {c.vagaReposicao.titulo}
                    </Link>
                    {c.reposicaoConcluidaEm ? (
                      <p className="mt-1 text-xs text-slate-500">
                        concluída em {formatDateBR(c.reposicaoConcluidaEm)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        em andamento
                      </p>
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            <CheckInsCard
              checkIns={checkIns}
              podeRegistrar={
                c.status === "em_garantia" || c.status === "garantia_acionada"
              }
            />
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
