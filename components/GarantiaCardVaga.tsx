"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Hourglass,
  PackagePlus,
  ShieldCheck,
  ShieldX,
  Users,
  XCircle,
} from "lucide-react";
import type { Modelo, ProtocoloStatus } from "@prisma/client";
import { AbrirProtocoloModal, type CandidatoOption } from "./AbrirProtocoloModal";
import { ConfirmarClienteModal } from "./ConfirmarClienteModal";
import { Select } from "@/components/ui/Select";
import {
  abrirVagaReposicao,
  concluirReposicao,
  encerrarProtocolo,
} from "@/app/protocolos/actions";
import { formatDateBR } from "@/lib/business-days";
import { PROTOCOLO_STATUS_TONE } from "@/lib/protocolos";

export interface GarantiaCardProtocolo {
  id: string;
  status: ProtocoloStatus;
  profissionalSaiuNome: string;
  dataSaida: Date;
  dataAdmissaoOriginal: Date | null;
  dentroGarantia: boolean | null;
  clienteConfirmou: boolean;
  clienteConfirmouEm: Date | null;
  clienteConfirmacaoVia: string | null;
  reposicaoVagaId: string | null;
  reposicaoCandidatoId: string | null;
  reposicaoConcluidaEm: Date | null;
}

interface GarantiaCardVagaProps {
  vagaId: string;
  vagaTitulo: string;
  vagaModelo: Modelo | null;
  vagaSalarioMin: number | null;
  vagaSalarioMax: number | null;
  vagaEncerrada: boolean;
  /** Candidatos da própria vaga, usados pra: identificar quem saiu OU
   * escolher substituto da shortlist. */
  candidatos: CandidatoOption[];
  /** Lista de protocolos da vaga (mais recente primeiro). */
  protocolos: GarantiaCardProtocolo[];
  canEdit: boolean;
}

export function GarantiaCardVaga({
  vagaId,
  vagaTitulo,
  vagaModelo,
  vagaSalarioMin,
  vagaSalarioMax,
  vagaEncerrada,
  candidatos,
  protocolos,
  canEdit,
}: GarantiaCardVagaProps) {
  const protocoloAtivo = protocolos.find(
    (p) =>
      p.status === "aberto" ||
      p.status === "aguardando_cliente" ||
      p.status === "ativada",
  );
  const protocolosFinalizados = protocolos.filter(
    (p) => p.status === "reposto" || p.status === "encerrado",
  );

  return (
    <section className="card border-lima-200 bg-lima-50/30 p-5">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lima-100 text-lima-700">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="section-label">Garantia & reposição</div>
          <h2 className="text-h3 text-ink">
            {protocoloAtivo
              ? "Protocolo de reposição em curso"
              : "Garantia disponível"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {protocoloAtivo
              ? "Acompanhe o andamento abaixo."
              : vagaEncerrada
                ? "Vaga encerrada com cobertura. Se o cliente pedir reposição, abra o protocolo."
                : "Cobertura ativa quando a vaga for encerrada com contratação."}
          </p>
        </div>
      </header>

      {protocoloAtivo ? (
        <ProtocoloAtivoBlock
          vagaId={vagaId}
          protocolo={protocoloAtivo}
          candidatos={candidatos}
          canEdit={canEdit}
        />
      ) : (
        <SemProtocoloBlock
          vagaId={vagaId}
          vagaTitulo={vagaTitulo}
          vagaModelo={vagaModelo}
          vagaSalarioMin={vagaSalarioMin}
          vagaSalarioMax={vagaSalarioMax}
          vagaEncerrada={vagaEncerrada}
          candidatos={candidatos}
          canEdit={canEdit}
        />
      )}

      {protocolosFinalizados.length > 0 && (
        <ProtocolosHistorico protocolos={protocolosFinalizados} />
      )}
    </section>
  );
}

function SemProtocoloBlock({
  vagaId,
  vagaTitulo,
  vagaModelo,
  vagaSalarioMin,
  vagaSalarioMax,
  vagaEncerrada,
  candidatos,
  canEdit,
}: Omit<GarantiaCardVagaProps, "protocolos">) {
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!vagaEncerrada}
        className="btn-secondary text-sm"
        title={
          vagaEncerrada
            ? undefined
            : "Disponível após o encerramento da vaga com contratação"
        }
      >
        <AlertCircle size={14} className="text-amber-600" />
        Solicitar reposição
      </button>
      <AbrirProtocoloModal
        open={open}
        onClose={() => setOpen(false)}
        vagaId={vagaId}
        vagaTitulo={vagaTitulo}
        vagaModelo={vagaModelo}
        vagaSalarioMin={vagaSalarioMin}
        vagaSalarioMax={vagaSalarioMax}
        candidatosDaVaga={candidatos}
      />
    </>
  );
}

function ProtocoloAtivoBlock({
  vagaId,
  protocolo,
  candidatos,
  canEdit,
}: {
  vagaId: string;
  protocolo: GarantiaCardProtocolo;
  candidatos: CandidatoOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [substituto, setSubstituto] = useState("");
  const [encerrarMotivo, setEncerrarMotivo] = useState("");
  const [encerrandoOpen, setEncerrandoOpen] = useState(false);

  const tone = PROTOCOLO_STATUS_TONE[protocolo.status];

  function abrirVagaNova() {
    if (submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await abrirVagaReposicao(protocolo.id);
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Vaga de reposição aberta · prazo de 30 dias úteis.");
      setSubmitting(false);
      router.refresh();
      router.push(`/vagas/${r.data!.vagaId}`);
    });
  }

  function concluirComCandidato() {
    if (!substituto || submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await concluirReposicao({
        protocoloId: protocolo.id,
        candidatoSubstitutoId: substituto,
      });
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Reposição concluída.");
      setSubmitting(false);
      setSubstituto("");
      router.refresh();
    });
  }

  function encerrarSemReposicao() {
    if (encerrarMotivo.trim().length < 5 || submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await encerrarProtocolo({
        protocoloId: protocolo.id,
        motivoEncerramento: encerrarMotivo,
      });
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Protocolo encerrado.");
      setSubmitting(false);
      setEncerrandoOpen(false);
      setEncerrarMotivo("");
      router.refresh();
    });
  }

  // Candidatos elegíveis pra reposição (excluindo quem saiu)
  const candidatosReposicao = candidatos.filter(
    (c) => c.id !== protocolo.reposicaoCandidatoId,
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
          >
            {protocolo.status === "aberto" && "Em triagem"}
            {protocolo.status === "aguardando_cliente" &&
              "Aguardando cliente"}
            {protocolo.status === "ativada" && "Garantia ATIVA"}
          </span>
          <span className="text-sm font-semibold text-ink">
            {protocolo.profissionalSaiuNome}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Saída em {formatDateBR(protocolo.dataSaida)}
          {protocolo.clienteConfirmouEm
            ? ` · cliente confirmou em ${formatDateBR(protocolo.clienteConfirmouEm)}`
            : ""}
        </div>
      </div>

      {protocolo.status === "aguardando_cliente" && canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <div className="flex items-start gap-2">
            <Hourglass
              size={14}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div className="flex-1 text-xs text-amber-900">
              <p className="font-semibold">
                Aguardando confirmação do cliente
              </p>
              <p className="mt-0.5">
                Avise o cliente como vai funcionar. Quando ele confirmar
                (email/WhatsApp/etc), registre aqui pra ATIVAR a garantia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmarOpen(true)}
            className="btn-primary mt-3 text-xs"
          >
            <CheckCircle2 size={14} />
            Registrar confirmação do cliente
          </button>
          <ConfirmarClienteModal
            open={confirmarOpen}
            onClose={() => setConfirmarOpen(false)}
            protocoloId={protocolo.id}
            profissionalNome={protocolo.profissionalSaiuNome}
          />
        </div>
      )}

      {protocolo.status === "ativada" && canEdit && (
        <div className="rounded-xl border border-royal-200 bg-royal-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-royal-700">
            Caminhos da reposição
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Cliente confirmou. Agora escolha como vamos repor.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* A — shortlist */}
            <div className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <Users size={12} className="text-slate-500" />
                Reaproveitar shortlist
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Substituto direto entre os candidatos já avaliados desta vaga.
                Confirme se ainda estão disponíveis.
              </p>
              {candidatosReposicao.length === 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  Nenhum candidato disponível na shortlist atual.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <Select
                    value={substituto}
                    onChange={setSubstituto}
                    placeholder="Escolher substituto…"
                    options={candidatosReposicao.map((c) => ({
                      value: c.id,
                      label: c.nome,
                    }))}
                  />
                  <button
                    type="button"
                    onClick={concluirComCandidato}
                    disabled={!substituto || submitting}
                    className="btn-primary w-full justify-center text-xs"
                  >
                    <CheckCircle2 size={14} />
                    Concluir reposição
                  </button>
                </div>
              )}
            </div>

            {/* B — vaga nova */}
            <div className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <PackagePlus size={12} className="text-slate-500" />
                Abrir vaga nova
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Vaga nova com prazo de 30 dias úteis pra entregar reposição
                de qualidade. Sem cobrança.
              </p>
              {protocolo.reposicaoVagaId ? (
                <Link
                  href={`/vagas/${protocolo.reposicaoVagaId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                >
                  <ExternalLink size={12} />
                  Vaga já aberta
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={abrirVagaNova}
                  disabled={submitting}
                  className="btn-secondary mt-2 w-full justify-center text-xs"
                >
                  <PackagePlus size={14} />
                  Abrir vaga nova
                </button>
              )}
            </div>
          </div>

          {/* Encerrar sem reposição (cliente desistiu, etc) */}
          <div className="mt-3 border-t border-royal-200 pt-3">
            {!encerrandoOpen ? (
              <button
                type="button"
                onClick={() => setEncerrandoOpen(true)}
                className="text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                Encerrar sem reposição
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={encerrarMotivo}
                  onChange={(e) => setEncerrarMotivo(e.target.value)}
                  placeholder="Motivo (cliente desistiu, indisponibilidade, etc.)"
                  className="input min-h-[60px] resize-y text-sm"
                  maxLength={2000}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEncerrandoOpen(false);
                      setEncerrarMotivo("");
                    }}
                    className="btn-ghost text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={encerrarSemReposicao}
                    disabled={
                      encerrarMotivo.trim().length < 5 || submitting
                    }
                    className="btn-secondary text-xs"
                  >
                    <XCircle size={12} className="text-red-600" />
                    Confirmar encerramento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProtocolosHistorico({
  protocolos,
}: {
  protocolos: GarantiaCardProtocolo[];
}) {
  return (
    <div className="mt-4 border-t border-lima-200 pt-3">
      <p className="section-label mb-2">Histórico</p>
      <ul className="space-y-1.5">
        {protocolos.map((p) => {
          const tone = PROTOCOLO_STATUS_TONE[p.status];
          return (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs"
            >
              {p.status === "reposto" ? (
                <CheckCircle2
                  size={12}
                  className="shrink-0 text-emerald-600"
                />
              ) : (
                <ShieldX size={12} className="shrink-0 text-red-600" />
              )}
              <span className="font-medium text-ink">
                {p.profissionalSaiuNome}
              </span>
              <span className="text-slate-500">
                · saída {formatDateBR(p.dataSaida)}
              </span>
              <span
                className={`ml-auto inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
              >
                {p.status === "reposto" ? "Reposto" : "Encerrado"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
