import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import type { Senioridade, StatusCandidato } from "@prisma/client";
import { AppShell } from "@/components/shell/AppShell";
import { TalentoInfoForm } from "@/components/TalentoInfoForm";
import { TalentoHeaderActions } from "@/components/TalentoHeaderActions";
import { VincularTalentoVaga } from "@/components/VincularTalentoVaga";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatPhone, getInitials } from "@/lib/format";
import { formatDateBR } from "@/lib/business-days";

interface PageProps {
  params: { id: string };
}

const SENIORIDADE_LABEL: Record<Senioridade, string> = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  lideranca: "Liderança",
};

const STATUS_LABEL: Record<StatusCandidato, string> = {
  triagem: "Triagem",
  entrevista: "Entrevista",
  shortlist: "Shortlist",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_BADGE: Record<StatusCandidato, string> = {
  triagem: "badge-slate",
  entrevista: "badge-royal",
  shortlist: "badge-lima",
  aprovado: "badge-green",
  reprovado: "badge-red",
};

export default async function TalentoDetailPage({ params }: PageProps) {
  const session = await requireSession();

  const talento = await prisma.talento.findUnique({
    where: { id: params.id },
    include: {
      candidatos: {
        orderBy: { createdAt: "desc" },
        include: {
          vaga: {
            select: {
              id: true,
              titulo: true,
              cliente: true,
              encerrada: true,
            },
          },
        },
      },
    },
  });

  if (!talento) notFound();

  const vagasScope =
    session.user.role === "admin"
      ? {}
      : { recrutadorId: session.user.id };

  const vagasAtivasRaw = await prisma.vaga.findMany({
    where: { ...vagasScope, encerrada: false },
    select: { id: true, titulo: true, cliente: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const vagasJaVinculadas = talento.candidatos.map((c) => c.vagaId);

  const cidadeEstado = [talento.cidade, talento.estado]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" / ");

  const cvUrl = talento.cvArquivoUrl ?? talento.linkCV ?? null;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Talentos", href: "/talentos" },
        { label: talento.nome },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 animate-fade-in-up md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-pop ${
                talento.ativo
                  ? "bg-gradient-royal text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
              aria-hidden
            >
              {getInitials(talento.nome)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {talento.ativo ? (
                  <span className="badge-green">Ativo</span>
                ) : (
                  <span className="badge-slate">Arquivado</span>
                )}
                {talento.senioridade ? (
                  <span className="badge-royal">
                    {SENIORIDADE_LABEL[talento.senioridade]}
                  </span>
                ) : null}
                {talento.area ? (
                  <span className="badge-slate">{talento.area}</span>
                ) : null}
                {talento.fonteOrigem === "site" ? (
                  <span className="badge-slate">Cadastro pelo site</span>
                ) : null}
              </div>
              <h1 className="mt-1 text-2xl font-bold text-ink">
                {talento.nome}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {talento.email ? (
                  <a
                    href={`mailto:${talento.email}`}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    <Mail size={12} />
                    {talento.email}
                  </a>
                ) : null}
                {talento.telefone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} />
                    {formatPhone(talento.telefone)}
                  </span>
                ) : null}
                {cidadeEstado ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} />
                    {cidadeEstado}
                  </span>
                ) : null}
                {talento.linkedinUrl ? (
                  <a
                    href={talento.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-royal hover:underline"
                  >
                    <Linkedin size={12} />
                    LinkedIn
                    <ExternalLink size={10} />
                  </a>
                ) : null}
                {cvUrl ? (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-royal hover:underline"
                  >
                    <FileText size={12} />
                    Currículo
                    <ExternalLink size={10} />
                  </a>
                ) : null}
              </div>

              {talento.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {talento.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TalentoHeaderActions
              talentoId={talento.id}
              ativo={talento.ativo}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TalentoInfoForm talento={talento} />
          </div>

          <aside className="flex flex-col gap-6">
            <section className="card p-5">
              <h2 className="mb-1 text-base font-bold text-ink">
                Candidaturas
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Vagas em que este talento já foi considerado.
              </p>

              {talento.candidatos.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Ainda não está em nenhuma vaga.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {talento.candidatos.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">
                          {c.vaga.titulo}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {c.vaga.cliente}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={STATUS_BADGE[c.status]}>
                            {STATUS_LABEL[c.status]}
                          </span>
                          {c.vaga.encerrada ? (
                            <span className="badge-slate">Vaga encerrada</span>
                          ) : null}
                          <span className="text-[10px] text-slate-400">
                            desde {formatDateBR(c.etapaDesde)}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/vagas/${c.vaga.id}`}
                        className="shrink-0 text-xs font-semibold text-royal hover:underline"
                      >
                        Abrir vaga
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {talento.ativo ? (
              <VincularTalentoVaga
                talentoId={talento.id}
                vagas={vagasAtivasRaw}
                vagasJaVinculadas={vagasJaVinculadas}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
