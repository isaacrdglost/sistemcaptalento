import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AlertaVaga } from "@/components/AlertaVaga";
import { CandidatoList } from "@/components/CandidatoList";
import { VagaInfoForm } from "@/components/VagaInfoForm";
import { VagaTimeline } from "@/components/VagaTimeline";
import { Avatar } from "@/components/ui/Avatar";
import {
  GarantiaCardVaga,
  type GarantiaCardProtocolo,
} from "@/components/GarantiaCardVaga";
import type { CandidatoOption } from "@/components/AbrirProtocoloModal";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { computeVagaDerived, fluxoLabel, prazoCor } from "@/lib/flows";
import {
  formatDateBR,
  formatDiasRestantes,
  formatRelative,
} from "@/lib/business-days";

interface PageProps {
  params: { id: string };
}

const PRAZO_TONE: Record<
  "verde" | "ambar" | "vermelho" | "neutro",
  string
> = {
  verde: "text-emerald-700",
  ambar: "text-amber-700",
  vermelho: "text-red-700",
  neutro: "text-slate-500",
};

function faseLabel(fase: 1 | 2): string {
  return fase === 1 ? "Fase 1 — Pré-publicação" : "Fase 2 — Ativa";
}

export default async function VagaDetailPage({ params }: PageProps) {
  const session = await requireSession();

  const vaga = await prisma.vaga.findUnique({
    where: { id: params.id },
    include: {
      candidatos: {
        orderBy: { createdAt: "desc" },
        include: {
          analises: {
            include: { autor: { select: { nome: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      recrutador: { select: { id: true, nome: true } },
      protocolos: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          profissionalSaiuNome: true,
          dataSaida: true,
          dataAdmissaoOriginal: true,
          dentroGarantia: true,
          clienteConfirmou: true,
          clienteConfirmouEm: true,
          clienteConfirmacaoVia: true,
          reposicaoVagaId: true,
          reposicaoCandidatoId: true,
          reposicaoConcluidaEm: true,
        },
      },
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

  const [recrutadores, clientes, ultimaAtividade] = await Promise.all([
    session.user.role === "admin"
      ? prisma.user.findMany({
          where: { role: "recruiter", ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.atividade.findFirst({
      where: { vagaId: vaga.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const dias = derived.diasRestantesPrazo;
  const prazoTone = PRAZO_TONE[prazoCor(dias)];
  const prazoTexto =
    dias === null
      ? "Prazo não definido"
      : dias < 0
        ? formatDiasRestantes(dias)
        : dias === 0
          ? "Vence hoje"
          : `Vence ${formatDiasRestantes(dias)}`;

  const totalAnalises = vaga.candidatos.reduce(
    (acc, c) => acc + c.analises.length,
    0,
  );
  const analisesPendentes = vaga.candidatos.reduce(
    (acc, c) =>
      acc + c.analises.filter((a) => a.resultado === "pendente").length,
    0,
  );

  const totalAlertas = derived.alertas.length;
  const tituloCurto = vaga.titulo.length <= 60;

  // Dados pro GarantiaCardVaga (só renderizado quando vaga.temGarantia=true)
  const protocolos: GarantiaCardProtocolo[] = vaga.protocolos.map((p) => ({
    id: p.id,
    status: p.status,
    profissionalSaiuNome: p.profissionalSaiuNome,
    dataSaida: p.dataSaida,
    dataAdmissaoOriginal: p.dataAdmissaoOriginal,
    dentroGarantia: p.dentroGarantia,
    clienteConfirmou: p.clienteConfirmou,
    clienteConfirmouEm: p.clienteConfirmouEm,
    clienteConfirmacaoVia: p.clienteConfirmacaoVia,
    reposicaoVagaId: p.reposicaoVagaId,
    reposicaoCandidatoId: p.reposicaoCandidatoId,
    reposicaoConcluidaEm: p.reposicaoConcluidaEm,
  }));

  const candidatosVaga: CandidatoOption[] = vaga.candidatos.map((c) => ({
    id: c.id,
    nome: c.nome,
    status: c.status,
  }));

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
      <div className="container-app space-y-8">
        {/* === Hero header === */}
        <header
          className="card-hero p-7 sm:p-8 animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 text-eyebrow uppercase text-slate-500">
                {vaga.fluxo === "rapido" ? (
                  <Zap size={14} className="text-lima-600" />
                ) : (
                  <Sparkles size={14} className="text-royal-600" />
                )}
                <span>Vaga · Fluxo {fluxoLabel(vaga.fluxo)}</span>
              </div>

              {/* Título */}
              <h1
                className={`mt-2 ${
                  tituloCurto ? "text-display" : "text-h1"
                } text-ink text-balance`}
              >
                {vaga.titulo}
              </h1>

              {/* Cliente + recrutador */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-white/70 px-2.5 py-1 text-sm font-medium text-ink shadow-xs backdrop-blur-sm">
                  <Avatar nome={vaga.cliente} size="xs" />
                  <span className="truncate max-w-[18rem]">{vaga.cliente}</span>
                </span>
                {session.user.role === "admin" && vaga.recrutador?.nome && (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Avatar
                      nome={vaga.recrutador.nome}
                      size="xs"
                      gradient
                    />
                    <span>
                      por{" "}
                      <span className="text-slate-700 font-medium">
                        {vaga.recrutador.nome}
                      </span>
                    </span>
                  </span>
                )}
                {derived.estaAtrasada && !vaga.encerrada && (
                  <span className="badge-red inline-flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Atrasada
                  </span>
                )}
                {vaga.encerrada && (
                  <span className="badge-slate inline-flex items-center gap-1.5">
                    <Lock size={12} />
                    Encerrada
                    {vaga.dataEncerramento &&
                      ` em ${formatDateBR(vaga.dataEncerramento)}`}
                  </span>
                )}
                {totalAlertas > 0 && !vaga.encerrada && (
                  <a
                    href="#alertas"
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-100 transition hover:bg-red-100"
                  >
                    <span className="dot-pulse text-red-500" />
                    {totalAlertas}{" "}
                    {totalAlertas === 1 ? "alerta" : "alertas"}
                  </a>
                )}
              </div>
            </div>

            {/* Ações lado direito */}
            <div className="flex items-center gap-2 self-start">
              <a
                href="#vaga-info-form"
                className="btn-ghost text-xs"
                title="Editar informações da vaga"
              >
                Editar info
              </a>
            </div>
          </div>

          {/* Strip de mini-stats */}
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line/60 pt-5 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat
              icon={
                <Sparkles size={14} className="text-royal-600" />
              }
              label="Fase"
              value={faseLabel(derived.fase).split("—")[0].trim()}
              hint={faseLabel(derived.fase).split("—")[1]?.trim()}
            />
            <MiniStat
              icon={
                <CalendarClock size={14} className={prazoTone} />
              }
              label="Prazo"
              value={
                derived.prazoFinal ? formatDateBR(derived.prazoFinal) : "—"
              }
              hint={prazoTexto}
              hintTone={prazoTone}
            />
            <MiniStat
              icon={<Users size={14} className="text-royal-600" />}
              label="Candidatos"
              value={String(vaga.candidatos.length)}
              hint={
                vaga.candidatos.length === 1
                  ? "registrado"
                  : "registrados"
              }
            />
            <MiniStat
              icon={
                <ShieldCheck size={14} className="text-royal-600" />
              }
              label="Análises"
              value={`${totalAnalises}`}
              hint={
                analisesPendentes > 0
                  ? `${analisesPendentes} pendente${analisesPendentes === 1 ? "" : "s"}`
                  : "todas concluídas"
              }
              hintTone={
                analisesPendentes > 0 ? "text-amber-700" : "text-emerald-700"
              }
            />
            <MiniStat
              icon={<Clock size={14} className="text-slate-500" />}
              label="Última atividade"
              value={
                ultimaAtividade
                  ? formatRelative(ultimaAtividade.createdAt)
                  : "—"
              }
              hint={
                ultimaAtividade
                  ? formatDateBR(ultimaAtividade.createdAt)
                  : "Sem registros"
              }
            />
          </div>
        </header>

        {/* === Layout principal === */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              <VagaTimeline vaga={vaga} derived={derived} canEdit={canEdit} />
            </div>
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "120ms" }}
            >
              {vaga.temGarantia ? (
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "100ms" }}
                >
                  <GarantiaCardVaga
                    vagaId={vaga.id}
                    vagaTitulo={vaga.titulo}
                    vagaModelo={vaga.modelo}
                    vagaSalarioMin={
                      vaga.salarioMin ? Number(vaga.salarioMin) : null
                    }
                    vagaSalarioMax={
                      vaga.salarioMax ? Number(vaga.salarioMax) : null
                    }
                    vagaEncerrada={vaga.encerrada}
                    candidatos={candidatosVaga}
                    protocolos={protocolos}
                    canEdit={canEdit}
                  />
                </div>
              ) : null}

              <CandidatoList
                vagaId={vaga.id}
                candidatos={vaga.candidatos}
                canEdit={canEdit}
                vagaResumo={{
                  titulo: vaga.titulo,
                  modelo: vaga.modelo,
                  salarioMin: vaga.salarioMin
                    ? Number(vaga.salarioMin)
                    : null,
                  salarioMax: vaga.salarioMax
                    ? Number(vaga.salarioMax)
                    : null,
                }}
              />
            </div>
          </div>

          {/* Coluna direita */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            {derived.alertas.length > 0 && (
              <section
                id="alertas"
                className="card p-5 animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                <header className="mb-3 flex items-center justify-between">
                  <h2 className="text-h3 text-ink">Alertas</h2>
                  <span className="badge-red">
                    {derived.alertas.length}
                  </span>
                </header>
                <AlertaVaga alertas={derived.alertas} />
              </section>
            )}

            <div
              id="vaga-info-form"
              className="animate-fade-in-up scroll-mt-24"
              style={{ animationDelay: "160ms" }}
            >
              <VagaInfoForm
                vaga={vaga}
                recrutadores={recrutadores}
                clientes={clientes}
                role={session.user.role}
              />
            </div>

            <section
              className="card p-5 animate-fade-in-up"
              style={{ animationDelay: "220ms" }}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 text-ink">Atividade</h2>
                <span className="text-xs text-slate-400">
                  últimas 20
                </span>
              </header>
              <div className="max-h-[28rem] overflow-y-auto pr-2">
                <ActivityFeed vagaId={vaga.id} limit={20} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

interface MiniStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
}

function MiniStat({ icon, label, value, hint, hintTone }: MiniStatProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-eyebrow uppercase text-slate-500">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-base font-semibold text-ink">
        {value}
      </div>
      {hint && (
        <div
          className={`truncate text-xs ${hintTone ?? "text-slate-500"}`}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

