"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  PackagePlus,
  ShieldCheck,
  ShieldX,
  Users,
} from "lucide-react";
import type {
  Modelo,
  StatusContratacao,
} from "@prisma/client";
import { ContratacaoModal } from "./ContratacaoModal";
import { ProtocoloReposicaoModal } from "./ProtocoloReposicaoModal";
import { Select } from "@/components/ui/Select";
import {
  concluirReposicao,
  criarReposicaoVaga,
} from "@/app/contratacoes/actions";
import {
  diasRestantesGarantia,
  resumoStatusGarantia,
  toneGarantia,
} from "@/lib/garantia";
import { formatDateBR } from "@/lib/business-days";

export interface GarantiaCardCandidatoOption {
  id: string;
  nome: string;
  status: string;
}

export interface GarantiaCardContratacao {
  id: string;
  status: StatusContratacao;
  dataAdmissao: Date;
  dataFimGarantia: Date;
  dataSaida: Date | null;
  saidaDentroGarantia: boolean | null;
  reposicaoVagaId: string | null;
  candidatoId: string;
  candidatoNome: string;
}

interface GarantiaCardVagaProps {
  vagaId: string;
  vagaTitulo: string;
  vagaModelo: Modelo | null;
  vagaSalarioMin: number | null;
  vagaSalarioMax: number | null;
  dataShortlistEntregue: Date | null;
  /** Candidatos disponíveis pra contratação inicial (status >= shortlist
   * que ainda não estão em contratação ativa). */
  candidatosContrataveis: GarantiaCardCandidatoOption[];
  /** Candidatos da shortlist da MESMA vaga (excluindo o já contratado),
   * usados na reposição. */
  candidatosReposicaoMesmaVaga: GarantiaCardCandidatoOption[];
  contratacao: GarantiaCardContratacao | null;
  canEdit: boolean;
}

export function GarantiaCardVaga({
  vagaId,
  vagaTitulo,
  vagaModelo,
  vagaSalarioMin,
  vagaSalarioMax,
  dataShortlistEntregue,
  candidatosContrataveis,
  candidatosReposicaoMesmaVaga,
  contratacao,
  canEdit,
}: GarantiaCardVagaProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [contratacaoModalOpen, setContratacaoModalOpen] = useState(false);
  const [protocoloModalOpen, setProtocoloModalOpen] = useState(false);
  const [candidatoEscolhido, setCandidatoEscolhido] = useState("");
  const [candidatoSubstituto, setCandidatoSubstituto] = useState("");

  function abrirVagaReposicao() {
    if (!contratacao || submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await criarReposicaoVaga(contratacao.id);
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Vaga de reposição aberta — sem cobrança.");
      setSubmitting(false);
      router.refresh();
      router.push(`/vagas/${r.data!.vagaId}`);
    });
  }

  function concluirComCandidato() {
    if (!contratacao || submitting || !candidatoSubstituto) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await concluirReposicao({
        contratacaoId: contratacao.id,
        candidatoNovoId: candidatoSubstituto,
      });
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Reposição concluída.");
      setSubmitting(false);
      setCandidatoSubstituto("");
      router.refresh();
    });
  }

  // ESTADO 1: sem contratação registrada
  if (!contratacao) {
    return (
      <>
        <section className="card border-lima-200 bg-lima-50/30 p-5">
          <header className="mb-3 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lima-100 text-lima-700">
              <ShieldCheck size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="section-label">Garantia & reposição</div>
              <h2 className="text-h3 text-ink">
                {dataShortlistEntregue
                  ? "Pronto pra registrar a contratação?"
                  : "Aguardando shortlist"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {dataShortlistEntregue
                  ? "Quando o cliente confirmar a admissão, registre a data e os termos. A garantia de 30d começa a contar."
                  : "Entregue a shortlist primeiro. O sistema sugere a data de admissão a partir dela."}
              </p>
            </div>
          </header>

          {canEdit && dataShortlistEntregue ? (
            <div className="space-y-3">
              {candidatosContrataveis.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Nenhum candidato em shortlist/aprovado disponível. Mova
                  alguém da triagem antes de registrar.
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Select
                      value={candidatoEscolhido}
                      onChange={setCandidatoEscolhido}
                      placeholder="Selecione o candidato contratado…"
                      options={candidatosContrataveis.map((c) => ({
                        value: c.id,
                        label: c.nome,
                        description: c.status,
                      }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setContratacaoModalOpen(true)}
                    disabled={!candidatoEscolhido}
                    className="btn-primary shrink-0 text-sm"
                  >
                    <ShieldCheck size={14} />
                    Registrar contratação
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {candidatoEscolhido ? (
          <ContratacaoModal
            open={contratacaoModalOpen}
            onClose={() => setContratacaoModalOpen(false)}
            candidato={(() => {
              const c = candidatosContrataveis.find(
                (x) => x.id === candidatoEscolhido,
              );
              return {
                id: candidatoEscolhido,
                nome: c?.nome ?? "—",
              };
            })()}
            vaga={{
              titulo: vagaTitulo,
              modelo: vagaModelo,
              salarioMin: vagaSalarioMin,
              salarioMax: vagaSalarioMax,
              dataShortlistEntregue,
            }}
          />
        ) : null}
      </>
    );
  }

  // Tem contratação — mostra status e ações conforme estado
  const c = contratacao;
  const tone = toneGarantia(c.status, c.dataFimGarantia);
  const dias = diasRestantesGarantia(c.dataFimGarantia);
  const toneClasses: Record<typeof tone, string> = {
    lima: "border-lima-200 bg-lima-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    slate: "border-line bg-slate-50",
  };

  const podeAcionar =
    canEdit && (c.status === "em_garantia" || c.status === "garantia_ok");
  const podeConcluirReposicao =
    canEdit &&
    c.status === "garantia_acionada" &&
    c.saidaDentroGarantia === true;

  return (
    <>
      <section className={`card ${toneClasses[tone]} p-5`}>
        <header className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lima-700 ring-1 ring-line">
            {c.status === "garantia_acionada" ? (
              <FileCheck2 size={18} className="text-amber-700" />
            ) : c.status === "encerrado" ? (
              <ShieldX size={18} className="text-red-600" />
            ) : c.status === "reposto" ? (
              <CheckCircle2 size={18} className="text-lima-700" />
            ) : (
              <ShieldCheck size={18} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="section-label">Garantia & reposição</div>
            <h2 className="text-h3 text-ink">
              {c.status === "em_garantia"
                ? `Em garantia · ${dias > 0 ? `${dias}d restantes` : "vencendo"}`
                : c.status === "garantia_ok"
                  ? "Garantia concluída sem incidente"
                  : c.status === "garantia_acionada"
                    ? "Protocolo aberto"
                    : c.status === "reposto"
                      ? "Reposição concluída"
                      : "Contratação encerrada"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {c.candidatoNome} · admissão {formatDateBR(c.dataAdmissao)} ·
              garantia até {formatDateBR(c.dataFimGarantia)}
            </p>
            {c.status === "garantia_acionada" && c.dataSaida ? (
              <p className="mt-1 text-xs text-slate-600">
                Saída em {formatDateBR(c.dataSaida)} ·{" "}
                {c.saidaDentroGarantia === true
                  ? "DENTRO da cobertura"
                  : c.saidaDentroGarantia === false
                    ? "FORA da cobertura"
                    : "aguardando triagem"}
              </p>
            ) : null}
          </div>
          <Link
            href={`/contratacoes/${c.id}`}
            className="hidden shrink-0 items-center gap-1 self-start text-xs font-semibold text-royal hover:underline sm:inline-flex"
          >
            Detalhe
            <ChevronRight size={12} />
          </Link>
        </header>

        {podeAcionar ? (
          <button
            type="button"
            onClick={() => setProtocoloModalOpen(true)}
            className="btn-secondary text-sm"
          >
            <AlertCircle size={14} className="text-red-600" />
            Abrir protocolo de reposição
          </button>
        ) : null}

        {podeConcluirReposicao ? (
          <div className="mt-2 space-y-3 rounded-lg border border-royal-200 bg-royal-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-royal-700">
              Caminho da reposição
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Caminho A — candidato da mesma vaga */}
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <Users size={12} className="text-slate-500" />
                  Recorrer à shortlist
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Substituto direto entre os candidatos já avaliados desta vaga.
                </p>
                {candidatosReposicaoMesmaVaga.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Nenhum candidato disponível na shortlist atual.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Select
                      value={candidatoSubstituto}
                      onChange={setCandidatoSubstituto}
                      placeholder="Escolher substituto…"
                      options={candidatosReposicaoMesmaVaga.map((x) => ({
                        value: x.id,
                        label: x.nome,
                        description: x.status,
                      }))}
                    />
                    <button
                      type="button"
                      onClick={concluirComCandidato}
                      disabled={!candidatoSubstituto || submitting}
                      className="btn-primary w-full justify-center text-xs"
                    >
                      <CheckCircle2 size={14} />
                      Concluir reposição
                    </button>
                  </div>
                )}
              </div>

              {/* Caminho B — abrir vaga nova */}
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <PackagePlus size={12} className="text-slate-500" />
                  Abrir vaga de reposição
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Cria uma vaga nova já preenchida com os termos congelados,
                  sem cobrança.
                </p>
                {c.reposicaoVagaId ? (
                  <Link
                    href={`/vagas/${c.reposicaoVagaId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                  >
                    <ExternalLink size={12} />
                    Vaga já aberta
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={abrirVagaReposicao}
                    disabled={submitting}
                    className="btn-secondary mt-2 w-full justify-center text-xs"
                  >
                    <PackagePlus size={14} />
                    Abrir vaga nova
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {c.status === "reposto" ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-lima-200 bg-white p-3 text-xs text-lima-700">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span>
              Ciclo da garantia fechado com reposição.{" "}
              <Link
                href={`/contratacoes/${c.id}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Ver protocolo
              </Link>
            </span>
          </div>
        ) : null}

        {c.status === "encerrado" ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-white p-3 text-xs text-red-700">
            <ShieldX size={14} className="mt-0.5 shrink-0" />
            <span>
              Contratação encerrada · saída triada FORA da cobertura.{" "}
              <Link
                href={`/contratacoes/${c.id}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Ver protocolo
              </Link>
            </span>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-slate-500">
          {resumoStatusGarantia(c)}
        </p>
      </section>

      <ProtocoloReposicaoModal
        open={protocoloModalOpen}
        onClose={() => setProtocoloModalOpen(false)}
        contratacaoId={c.id}
        candidatoNome={c.candidatoNome}
        dataAdmissao={c.dataAdmissao}
      />
    </>
  );
}
