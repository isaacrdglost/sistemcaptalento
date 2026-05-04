import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { LeadInfoForm } from "@/components/LeadInfoForm";
import { LeadDetailActions } from "@/components/LeadDetailActions";
import { LeadAtividadesPanel } from "@/components/LeadAtividadesPanel";
import { prisma } from "@/lib/prisma";
import { requireComercial } from "@/lib/session";
import {
  descricaoEstagioLead,
  descricaoOrigemLead,
} from "@/lib/activity-lead";
import { formatDateBR } from "@/lib/business-days";
import type { EstagioLead } from "@prisma/client";

interface PageProps {
  params: { id: string };
}

const ESTAGIO_BADGE: Record<EstagioLead, string> = {
  novo: "badge-dot bg-slate-100 text-slate-600 ring-slate-200",
  qualificado: "badge-dot bg-royal-50 text-royal-700 ring-royal-100",
  proposta: "badge-dot bg-amber-50 text-amber-700 ring-amber-100",
  negociacao: "badge-dot bg-amber-50 text-amber-700 ring-amber-100",
  ganho: "badge-dot bg-lima-50 text-lima-700 ring-lima-100",
  perdido: "badge-dot bg-red-50 text-red-700 ring-red-100",
};

export default async function LeadDetailPage({ params }: PageProps) {
  const session = await requireComercial();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      responsavel: { select: { id: true, nome: true } },
      cliente: {
        select: { id: true, razaoSocial: true, nomeFantasia: true },
      },
      atividades: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { autor: { select: { id: true, nome: true } } },
      },
    },
  });

  if (!lead) notFound();

  // Permissão: admin vê tudo. Comercial só vê próprios ou sem responsável.
  const podeAcessar =
    isAdmin || lead.responsavelId === null || lead.responsavelId === userId;
  if (!podeAcessar) notFound();

  const podeAgir =
    isAdmin || lead.responsavelId === null || lead.responsavelId === userId;
  const semResponsavel = lead.responsavelId === null;
  const subtitle =
    lead.nomeFantasia ?? lead.contatoNome ?? undefined;

  const atividades = lead.atividades.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    descricao: a.descricao,
    metadata: a.metadata,
    agendadoPara: a.agendadoPara,
    concluidoEm: a.concluidoEm,
    createdAt: a.createdAt,
    autor: a.autor,
  }));

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Vendas" },
        { label: "Pipeline", href: "/comercial/leads" },
        { label: lead.razaoSocial },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/comercial/leads"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-ink"
        >
          <ArrowLeft size={14} />
          Voltar para o pipeline
        </Link>

        <PageHeader
          eyebrow={`Lead · ${descricaoEstagioLead(lead.estagio)}`}
          title={lead.razaoSocial}
          subtitle={subtitle}
          actions={
            <LeadDetailActions
              leadId={lead.id}
              semResponsavel={semResponsavel}
              arquivado={lead.arquivado}
              podeAgir={podeAgir}
              estagio={lead.estagio}
              razaoSocial={lead.razaoSocial}
            />
          }
        />

        {lead.cliente ? (
          <div
            className="card flex flex-wrap items-center justify-between gap-3 border-lima-100 bg-lima-50/60 p-4"
          >
            <div className="text-sm text-lima-700">
              <span className="font-semibold">
                Lead convertido em cliente
              </span>
              {lead.dataGanho ? (
                <span className="text-lima-700/80">
                  {" "}em {formatDateBR(lead.dataGanho)}
                </span>
              ) : null}
              .
            </div>
            <Link
              href={`/clientes/${lead.cliente.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-lima-700 transition hover:text-lima-700/80"
            >
              Ver cliente
              <ArrowUpRight size={14} />
            </Link>
          </div>
        ) : null}

        {lead.estagio === "perdido" ? (
          <div className="card flex flex-wrap items-start justify-between gap-3 border-red-100 bg-red-50/50 p-4">
            <div className="text-sm text-red-700">
              <div className="font-semibold">Lead marcado como perdido</div>
              {lead.dataPerda ? (
                <div className="text-xs text-red-700/80 mt-0.5">
                  em {formatDateBR(lead.dataPerda)}
                </div>
              ) : null}
              {lead.motivoPerda ? (
                <div className="mt-2 text-sm text-red-700/90">
                  <span className="font-semibold">Motivo:</span>{" "}
                  {lead.motivoPerda}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <div className="section-label mb-1.5">Estágio</div>
            <span className={ESTAGIO_BADGE[lead.estagio]}>
              {descricaoEstagioLead(lead.estagio)}
            </span>
          </div>
          <div className="card p-4">
            <div className="section-label mb-1.5">Origem</div>
            <span className="badge-slate">
              {descricaoOrigemLead(lead.origem)}
            </span>
          </div>
          <div className="card p-4">
            <div className="section-label mb-1.5">Responsável</div>
            {lead.responsavel ? (
              <div className="flex items-center gap-2">
                <Avatar nome={lead.responsavel.nome} size="xs" />
                <span className="text-sm font-medium text-ink truncate">
                  {lead.responsavel.nome}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
          </div>
          <div className="card p-4">
            <div className="section-label mb-1.5">Criado em</div>
            <div className="flex items-center gap-1.5 text-sm text-ink">
              <CalendarDays size={14} className="text-slate-400" />
              {formatDateBR(lead.createdAt)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <div className="mb-5">
              <div className="section-label mb-1">Detalhes</div>
              <h2 className="text-h3 text-ink">Informações do lead</h2>
              <p className="mt-1 text-sm text-slate-500">
                {podeAgir
                  ? "Edite os dados e salve as alterações."
                  : "Você está visualizando este lead em modo somente-leitura."}
              </p>
            </div>
            <LeadInfoForm
              mode="edit"
              lead={lead}
              readOnly={
                !podeAgir ||
                lead.estagio === "ganho" ||
                lead.estagio === "perdido"
              }
            />
          </section>

          <aside className="lg:col-span-1">
            <LeadAtividadesPanel
              leadId={lead.id}
              atividades={atividades}
              currentUserId={userId}
              isAdmin={isAdmin}
              podeAgir={podeAgir}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
