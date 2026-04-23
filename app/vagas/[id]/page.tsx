import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AlertaVaga } from "@/components/AlertaVaga";
import { FluxoBadge } from "@/components/FluxoBadge";
import { CandidatoList } from "@/components/CandidatoList";
import { VagaInfoForm } from "@/components/VagaInfoForm";
import { VagaTimeline } from "@/components/VagaTimeline";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { computeVagaDerived, prazoCor } from "@/lib/flows";
import { formatDateBR, formatDiasRestantes } from "@/lib/business-days";

interface PageProps {
  params: { id: string };
}

const prazoBadgeClass: Record<
  "verde" | "ambar" | "vermelho" | "neutro",
  string
> = {
  verde: "badge-green",
  ambar: "badge-amber",
  vermelho: "badge-red",
  neutro: "badge-slate",
};

function faseLabel(fase: 1 | 2): string {
  return fase === 1 ? "Fase 1 — Pré-publicação" : "Fase 2 — Ativa";
}

export default async function VagaDetailPage({ params }: PageProps) {
  const session = await requireSession();

  const vaga = await prisma.vaga.findUnique({
    where: { id: params.id },
    include: {
      candidatos: { orderBy: { createdAt: "desc" } },
      recrutador: { select: { id: true, nome: true } },
    },
  });

  if (!vaga) notFound();
  if (
    session.user.role === "recruiter" &&
    vaga.recrutadorId !== session.user.id
  ) {
    notFound();
  }

  const canEdit =
    session.user.role === "admin" || vaga.recrutadorId === session.user.id;

  const derived = computeVagaDerived(vaga);

  const recrutadores =
    session.user.role === "admin"
      ? await prisma.user.findMany({
          where: { role: "recruiter", ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : [];

  const prazoClass = prazoBadgeClass[prazoCor(derived.diasRestantesPrazo)];
  const dias = derived.diasRestantesPrazo;
  const prazoTexto =
    dias === null
      ? "Prazo não definido"
      : dias < 0
        ? formatDiasRestantes(dias)
        : dias === 0
          ? "Vence hoje"
          : `Vence ${formatDiasRestantes(dias)}`;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: vaga.titulo },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-8">

        <header className="flex flex-col gap-3 animate-fade-in-up">
          <div className="flex flex-wrap items-center gap-2">
            <FluxoBadge fluxo={vaga.fluxo} />
            <span className="badge-slate">{faseLabel(derived.fase)}</span>
            {!vaga.encerrada && (
              <span className={prazoClass}>{prazoTexto}</span>
            )}
            {vaga.encerrada && <span className="badge-slate">Encerrada</span>}
          </div>
          <h1 className="text-2xl font-bold text-ink">{vaga.titulo}</h1>
          <p className="text-sm text-slate-600">
            <span className="font-medium">{vaga.cliente}</span>
            <span className="mx-2 text-slate-300">•</span>
            Briefing em {formatDateBR(vaga.dataBriefing)}
            {derived.prazoFinal && (
              <>
                <span className="mx-2 text-slate-300">•</span>
                Prazo previsto: {formatDateBR(derived.prazoFinal)}
              </>
            )}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <VagaTimeline vaga={vaga} derived={derived} canEdit={canEdit} />
            <CandidatoList
              vagaId={vaga.id}
              candidatos={vaga.candidatos}
              canEdit={canEdit}
            />
          </div>

          <aside className="flex flex-col gap-6">
            {derived.alertas.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">Alertas</h2>
                <AlertaVaga alertas={derived.alertas} />
              </div>
            )}

            <VagaInfoForm
              vaga={vaga}
              recrutadores={recrutadores}
              role={session.user.role}
            />

            <div className="card p-6">
              <h2 className="text-lg font-bold mb-3">Atividade</h2>
              <div className="max-h-96 overflow-y-auto pr-2">
                <ActivityFeed vagaId={vaga.id} limit={20} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
