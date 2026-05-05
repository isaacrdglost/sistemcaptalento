import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOperacional } from "@/lib/session";
import { formatDateBR } from "@/lib/business-days";
import { Logo } from "@/components/ui/Logo";

interface PageProps {
  params: { id: string };
}

const MODELO_LABEL: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export default async function TermoContratacaoPage({ params }: PageProps) {
  const session = await requireOperacional();
  const isAdmin = session.user.role === "admin";

  const c = await prisma.contratacao.findUnique({
    where: { id: params.id },
    include: {
      candidato: { select: { nome: true, email: true, telefone: true } },
      vaga: { select: { id: true, titulo: true } },
      cliente: {
        select: {
          razaoSocial: true,
          cnpj: true,
          contatoResponsavel: true,
          emailPrincipal: true,
        },
      },
      recrutadora: { select: { nome: true } },
    },
  });

  if (!c) notFound();
  if (!isAdmin && c.recrutadoraId !== session.user.id) notFound();

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <article className="mx-auto max-w-3xl space-y-8 rounded-2xl bg-white p-10 shadow-md print:shadow-none">
        <header className="flex items-center justify-between border-b border-line/70 pb-6">
          <Logo size={36} variant="brand" />
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Documento
            </p>
            <h1 className="text-lg font-bold text-ink">
              Termo de Contratação
            </h1>
          </div>
        </header>

        <section className="space-y-3 text-sm text-ink">
          <p>
            Este termo registra a contratação intermediada pela{" "}
            <strong>CapTalento RH</strong>, conforme proposta comercial
            previamente acordada com o cliente. Sua finalidade é confirmar
            os dados da admissão e as condições de garantia, servindo como
            documento de referência para ambas as partes.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Bloco titulo="Cliente">
            <div className="font-semibold text-ink">
              {c.cliente.razaoSocial}
            </div>
            {c.cliente.cnpj && (
              <div className="text-xs text-slate-500">CNPJ {c.cliente.cnpj}</div>
            )}
            {c.cliente.contatoResponsavel && (
              <div className="text-xs text-slate-500">
                {c.cliente.contatoResponsavel}
              </div>
            )}
            {c.cliente.emailPrincipal && (
              <div className="text-xs text-slate-500">
                {c.cliente.emailPrincipal}
              </div>
            )}
          </Bloco>
          <Bloco titulo="Profissional contratado">
            <div className="font-semibold text-ink">{c.candidato.nome}</div>
            {c.candidato.email && (
              <div className="text-xs text-slate-500">{c.candidato.email}</div>
            )}
            {c.candidato.telefone && (
              <div className="text-xs text-slate-500">
                {c.candidato.telefone}
              </div>
            )}
          </Bloco>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Termos da contratação
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Item label="Cargo" valor={c.cargoSnapshot} />
            <Item label="Salário / condições" valor={c.salarioSnapshot} />
            <Item
              label="Modelo"
              valor={MODELO_LABEL[c.modeloSnapshot] ?? c.modeloSnapshot}
            />
            <Item
              label="Data de admissão"
              valor={formatDateBR(c.dataAdmissao)}
            />
            {c.escopoSnapshot && (
              <div className="sm:col-span-2">
                <Item label="Escopo da função" valor={c.escopoSnapshot} />
              </div>
            )}
            {c.observacoesTermos && (
              <div className="sm:col-span-2">
                <Item label="Observações" valor={c.observacoesTermos} />
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-lima-200 bg-lima-50/40 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lima-700">
            Garantia de Reposição
          </h2>
          <p className="text-sm text-ink">
            A CapTalento RH oferece <strong>reposição gratuita</strong> em
            caso de desligamento do profissional contratado em até{" "}
            <strong>30 (trinta) dias corridos</strong> a partir da data de
            admissão indicada acima — ou seja, até{" "}
            <strong>{formatDateBR(c.dataFimGarantia)}</strong>.
          </p>
          <p className="mt-2 text-sm text-ink">
            A garantia é limitada à reposição de um novo candidato para a
            mesma vaga, mantendo o escopo, senioridade e modelo de
            contratação acordados, e <strong>não há reembolso de valores</strong>.
          </p>
          <p className="mt-2 text-sm text-ink">
            A garantia <strong>não se aplica</strong> em casos de:
          </p>
          <ul className="ml-5 mt-1 list-disc space-y-0.5 text-sm text-ink">
            <li>
              Alteração de escopo, salário, benefícios ou modelo de trabalho
              após a contratação;
            </li>
            <li>
              Desligamento por reestruturação interna, corte de custos ou
              decisão estratégica do cliente;
            </li>
            <li>
              Falhas no onboarding, gestão ou acompanhamento do profissional
              por parte do cliente.
            </li>
          </ul>
        </section>

        <footer className="space-y-2 border-t border-line/70 pt-6 text-xs text-slate-500">
          <div>
            Recrutadora responsável:{" "}
            <span className="text-ink">
              {c.recrutadora?.nome ?? "—"}
            </span>
          </div>
          <div>
            Vaga de origem:{" "}
            <span className="text-ink">{c.vaga.titulo}</span>
          </div>
          <div>Documento gerado em {formatDateBR(new Date())}</div>
          <div className="pt-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary text-xs"
            >
              Imprimir / Salvar PDF
            </button>
          </div>
        </footer>
      </article>
    </main>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line/70 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap text-sm text-ink">{valor}</dd>
    </div>
  );
}
