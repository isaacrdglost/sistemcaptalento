"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Gavel,
  PackagePlus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { StatusContratacao } from "@prisma/client";
import { AcionarGarantiaModal } from "./AcionarGarantiaModal";
import { TriarGarantiaModal } from "./TriarGarantiaModal";
import {
  concluirReposicao,
  criarReposicaoVaga,
} from "@/app/contratacoes/actions";
import { Select } from "@/components/ui/Select";

interface ContratacaoActionsProps {
  contratacaoId: string;
  status: StatusContratacao;
  candidatoNome: string;
  dataAdmissao: Date;
  saidaDentroGarantia: boolean | null;
  reposicaoVagaId: string | null;
  candidatosNaReposicao: { id: string; nome: string; status: string }[];
}

export function ContratacaoActions({
  contratacaoId,
  status,
  candidatoNome,
  dataAdmissao,
  saidaDentroGarantia,
  reposicaoVagaId,
  candidatosNaReposicao,
}: ContratacaoActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [acionarOpen, setAcionarOpen] = useState(false);
  const [triarOpen, setTriarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reposicaoSelecionada, setReposicaoSelecionada] = useState<string>("");

  function abrirReposicao() {
    if (submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await criarReposicaoVaga(contratacaoId);
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

  function concluir() {
    if (submitting || !reposicaoSelecionada) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await concluirReposicao({
        contratacaoId,
        candidatoNovoId: reposicaoSelecionada,
      });
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Reposição concluída.");
      setSubmitting(false);
      router.refresh();
    });
  }

  // Em garantia (dentro do prazo) ou garantia OK (até 30d depois) → pode acionar.
  const podeAcionar = status === "em_garantia" || status === "garantia_ok";
  const podeTriar = status === "garantia_acionada" && saidaDentroGarantia === null;
  const podeAbrirReposicao =
    status === "garantia_acionada" &&
    saidaDentroGarantia === true &&
    !reposicaoVagaId;
  const reposicaoEmAndamento =
    status === "garantia_acionada" &&
    saidaDentroGarantia === true &&
    reposicaoVagaId !== null;

  if (
    !podeAcionar &&
    !podeTriar &&
    !podeAbrirReposicao &&
    !reposicaoEmAndamento &&
    status !== "reposto"
  ) {
    return null;
  }

  return (
    <section className="card p-5">
      <h2 className="section-label mb-3">Próxima ação</h2>
      <div className="flex flex-wrap gap-2">
        {podeAcionar && (
          <button
            type="button"
            onClick={() => setAcionarOpen(true)}
            className="btn-secondary text-sm"
          >
            <AlertTriangle size={14} className="text-red-600" />
            Acionar garantia
          </button>
        )}
        {podeTriar && (
          <button
            type="button"
            onClick={() => setTriarOpen(true)}
            className="btn-primary bg-amber-600 text-sm hover:bg-amber-700"
          >
            <Gavel size={14} />
            Triar agora
          </button>
        )}
        {podeAbrirReposicao && (
          <button
            type="button"
            onClick={abrirReposicao}
            disabled={submitting}
            className="btn-primary text-sm"
          >
            <PackagePlus size={14} />
            {submitting ? "Abrindo…" : "Abrir vaga de reposição"}
          </button>
        )}
      </div>

      {reposicaoEmAndamento && (
        <div className="mt-4 rounded-lg border border-royal-200 bg-royal-50/40 p-3">
          <p className="text-sm font-semibold text-royal-700">
            Reposição em andamento
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Quando contratar o substituto, marque aqui pra fechar o ciclo.
          </p>
          {candidatosNaReposicao.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              Cadastre candidatos na vaga de reposição primeiro.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <Select
                  value={reposicaoSelecionada}
                  onChange={(v) => setReposicaoSelecionada(v)}
                  placeholder="Selecione o candidato substituto…"
                  options={candidatosNaReposicao.map((c) => ({
                    value: c.id,
                    label: c.nome,
                    description: c.status,
                  }))}
                />
              </div>
              <button
                type="button"
                onClick={concluir}
                disabled={!reposicaoSelecionada || submitting}
                className="btn-primary shrink-0 text-sm"
              >
                <ShieldCheck size={14} />
                Marcar reposição concluída
              </button>
            </div>
          )}
        </div>
      )}

      {status === "reposto" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-lima-200 bg-lima-50 p-3 text-sm text-lima-700">
          <RotateCcw size={14} className="mt-0.5 shrink-0" />
          <span>Ciclo da garantia fechado com reposição.</span>
        </div>
      )}

      <AcionarGarantiaModal
        open={acionarOpen}
        onClose={() => setAcionarOpen(false)}
        contratacaoId={contratacaoId}
        candidatoNome={candidatoNome}
        dataAdmissao={dataAdmissao}
      />
      <TriarGarantiaModal
        open={triarOpen}
        onClose={() => setTriarOpen(false)}
        contratacaoId={contratacaoId}
        candidatoNome={candidatoNome}
      />
    </section>
  );
}
