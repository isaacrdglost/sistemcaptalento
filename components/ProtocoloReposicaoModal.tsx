"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Gavel,
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { abrirProtocoloReposicao } from "@/app/contratacoes/actions";

type MotivoSaida =
  | "pedido_cliente"
  | "pedido_candidato"
  | "acordo_mutuo"
  | "inadequacao_tecnica"
  | "inadequacao_comportamental"
  | "reestruturacao_cliente"
  | "mudanca_escopo"
  | "falha_onboarding_cliente"
  | "outro";

interface ProtocoloReposicaoModalProps {
  open: boolean;
  onClose: () => void;
  contratacaoId: string;
  candidatoNome: string;
  dataAdmissao: Date;
}

const MOTIVO_OPTIONS = [
  { value: "pedido_cliente", label: "Pedido do cliente" },
  { value: "pedido_candidato", label: "Pedido do candidato" },
  { value: "acordo_mutuo", label: "Acordo mútuo" },
  { value: "inadequacao_tecnica", label: "Inadequação técnica" },
  { value: "inadequacao_comportamental", label: "Inadequação comportamental" },
  {
    value: "reestruturacao_cliente",
    label: "Reestruturação do cliente",
    description: "Excluído da garantia pela proposta",
  },
  {
    value: "mudanca_escopo",
    label: "Mudança de escopo",
    description: "Excluído da garantia pela proposta",
  },
  {
    value: "falha_onboarding_cliente",
    label: "Falha de onboarding do cliente",
    description: "Excluído da garantia pela proposta",
  },
  { value: "outro", label: "Outro" },
];

function todayLocalISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Step = 1 | 2 | 3;

interface UploadedFile {
  url: string;
  nome: string;
}

export function ProtocoloReposicaoModal({
  open,
  onClose,
  contratacaoId,
  candidatoNome,
  dataAdmissao,
}: ProtocoloReposicaoModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Saída
  const [dataSaida, setDataSaida] = useState(todayLocalISODate());
  const [motivo, setMotivo] = useState<MotivoSaida>("pedido_cliente");
  const [detalhe, setDetalhe] = useState("");

  // Step 2 — Exclusões + provas
  const [mudancaEscopo, setMudancaEscopo] = useState(false);
  const [mudancaEscopoEv, setMudancaEscopoEv] = useState("");
  const [reestruturacao, setReestruturacao] = useState(false);
  const [reestruturacaoEv, setReestruturacaoEv] = useState("");
  const [falhaOnboarding, setFalhaOnboarding] = useState(false);
  const [falhaOnboardingEv, setFalhaOnboardingEv] = useState("");
  const [anexos, setAnexos] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Decisão
  const [dentro, setDentro] = useState<"sim" | "nao">("sim");
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDataSaida(todayLocalISODate());
    setMotivo("pedido_cliente");
    setDetalhe("");
    setMudancaEscopo(false);
    setMudancaEscopoEv("");
    setReestruturacao(false);
    setReestruturacaoEv("");
    setFalhaOnboarding(false);
    setFalhaOnboardingEv("");
    setAnexos([]);
    setUploading(false);
    setDentro("sim");
    setJustificativa("");
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-evidencia", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Falha ao enviar arquivo");
        return;
      }
      setAnexos((prev) => [...prev, { url: json.url, nome: json.nomeArquivo }]);
    } catch {
      toast.error("Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) {
      void handleFile(f);
    }
    e.target.value = "";
  }

  function removerAnexo(idx: number) {
    setAnexos((prev) => prev.filter((_, i) => i !== idx));
  }

  const dataSaidaInvalida =
    !dataSaida || new Date(`${dataSaida}T12:00:00`) < dataAdmissao;
  const step1Ok = !dataSaidaInvalida;
  const step2Ok = true; // exclusões/anexos são opcionais
  const step3Ok = justificativa.trim().length >= 5;

  function avancar() {
    if (step === 1 && step1Ok) setStep(2);
    else if (step === 2 && step2Ok) setStep(3);
  }
  function voltar() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !step3Ok) return;
    setSubmitting(true);
    startTransition(async () => {
      const result = await abrirProtocoloReposicao({
        contratacaoId,
        dataSaida: new Date(`${dataSaida}T12:00:00`),
        motivoSaida: motivo,
        motivoSaidaDetalhe: detalhe,
        exclusoes: {
          mudancaEscopo,
          mudancaEscopoEvidencia: mudancaEscopoEv,
          reestruturacao,
          reestruturacaoEvidencia: reestruturacaoEv,
          falhaOnboarding,
          falhaOnboardingEvidencia: falhaOnboardingEv,
        },
        evidenciasUrls: anexos.map((a) => a.url),
        dentroGarantia: dentro === "sim",
        justificativa,
      });
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      toast.success(
        dentro === "sim"
          ? "Protocolo aberto · DENTRO da garantia. Próximo: escolher substituto."
          : "Protocolo aberto · FORA da garantia. Contratação encerrada.",
      );
      router.refresh();
      onClose();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !submitting && !uploading && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            className="card relative z-10 w-full max-w-xl overflow-hidden p-0"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onSubmit={onSubmit}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <FileCheck2 size={18} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Protocolo de reposição
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {candidatoNome}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && !uploading && onClose()}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <Stepper step={step} />

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {step === 1 && (
                <Step1Saida
                  dataSaida={dataSaida}
                  setDataSaida={setDataSaida}
                  motivo={motivo}
                  setMotivo={setMotivo}
                  detalhe={detalhe}
                  setDetalhe={setDetalhe}
                  dataSaidaInvalida={dataSaidaInvalida}
                />
              )}
              {step === 2 && (
                <Step2Exclusoes
                  mudancaEscopo={mudancaEscopo}
                  setMudancaEscopo={setMudancaEscopo}
                  mudancaEscopoEv={mudancaEscopoEv}
                  setMudancaEscopoEv={setMudancaEscopoEv}
                  reestruturacao={reestruturacao}
                  setReestruturacao={setReestruturacao}
                  reestruturacaoEv={reestruturacaoEv}
                  setReestruturacaoEv={setReestruturacaoEv}
                  falhaOnboarding={falhaOnboarding}
                  setFalhaOnboarding={setFalhaOnboarding}
                  falhaOnboardingEv={falhaOnboardingEv}
                  setFalhaOnboardingEv={setFalhaOnboardingEv}
                  anexos={anexos}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  onRemoverAnexo={removerAnexo}
                />
              )}
              {step === 3 && (
                <Step3Decisao
                  dentro={dentro}
                  setDentro={setDentro}
                  justificativa={justificativa}
                  setJustificativa={setJustificativa}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line/70 bg-slate-50/50 px-6 py-3">
              <button
                type="button"
                onClick={step === 1 ? onClose : voltar}
                disabled={submitting}
                className="btn-ghost text-sm"
              >
                {step === 1 ? "Cancelar" : (
                  <>
                    <ArrowLeft size={14} />
                    Voltar
                  </>
                )}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={avancar}
                  disabled={
                    (step === 1 && !step1Ok) ||
                    (step === 2 && !step2Ok) ||
                    uploading
                  }
                  className="btn-primary text-sm"
                >
                  Avançar
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || uploading || !step3Ok}
                  className={`btn-primary text-sm ${dentro === "sim" ? "" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {dentro === "sim" ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  {submitting
                    ? "Salvando…"
                    : dentro === "sim"
                      ? "Abrir protocolo · DENTRO"
                      : "Abrir protocolo · FORA"}
                </button>
              )}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "Saída" },
    { n: 2, label: "Exclusões e provas" },
    { n: 3, label: "Decisão" },
  ];
  return (
    <div className="flex items-center gap-2 border-b border-line/70 px-6 py-3 text-xs">
      {items.map((it, i) => {
        const ativo = step === it.n;
        const completo = step > it.n;
        return (
          <div key={it.n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                ativo
                  ? "bg-royal text-white"
                  : completo
                    ? "bg-lima-600 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {completo ? <Check size={12} /> : it.n}
            </span>
            <span
              className={`truncate ${ativo ? "font-semibold text-ink" : "text-slate-500"}`}
            >
              {it.label}
            </span>
            {i < items.length - 1 && (
              <span className="ml-1 mr-1 hidden h-px flex-1 bg-line sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1Saida({
  dataSaida,
  setDataSaida,
  motivo,
  setMotivo,
  detalhe,
  setDetalhe,
  dataSaidaInvalida,
}: {
  dataSaida: string;
  setDataSaida: (v: string) => void;
  motivo: MotivoSaida;
  setMotivo: (v: MotivoSaida) => void;
  detalhe: string;
  setDetalhe: (v: string) => void;
  dataSaidaInvalida: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Comece registrando os fatos: quando saiu e por quê.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="data-saida" className="label">
            Data da saída *
          </label>
          <input
            id="data-saida"
            type="date"
            required
            value={dataSaida}
            onChange={(e) => setDataSaida(e.target.value)}
            className="input"
          />
          {dataSaidaInvalida && dataSaida && (
            <p className="mt-1 text-xs text-red-600">
              Data anterior à admissão.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="motivo" className="label">
            Motivo declarado *
          </label>
          <Select
            id="motivo"
            value={motivo}
            onChange={(v) => setMotivo(v as MotivoSaida)}
            options={MOTIVO_OPTIONS}
          />
        </div>
      </div>
      <div>
        <label htmlFor="detalhe" className="label">
          Detalhe (o que o cliente falou?)
        </label>
        <textarea
          id="detalhe"
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
          className="input min-h-[60px] resize-y"
          maxLength={2000}
          placeholder="Anote o contexto. Vai ficar registrado no protocolo."
        />
      </div>
    </div>
  );
}

function Step2Exclusoes({
  mudancaEscopo,
  setMudancaEscopo,
  mudancaEscopoEv,
  setMudancaEscopoEv,
  reestruturacao,
  setReestruturacao,
  reestruturacaoEv,
  setReestruturacaoEv,
  falhaOnboarding,
  setFalhaOnboarding,
  falhaOnboardingEv,
  setFalhaOnboardingEv,
  anexos,
  uploading,
  fileInputRef,
  onFileChange,
  onRemoverAnexo,
}: {
  mudancaEscopo: boolean;
  setMudancaEscopo: (v: boolean) => void;
  mudancaEscopoEv: string;
  setMudancaEscopoEv: (v: string) => void;
  reestruturacao: boolean;
  setReestruturacao: (v: boolean) => void;
  reestruturacaoEv: string;
  setReestruturacaoEv: (v: string) => void;
  falhaOnboarding: boolean;
  setFalhaOnboarding: (v: boolean) => void;
  falhaOnboardingEv: string;
  setFalhaOnboardingEv: (v: string) => void;
  anexos: UploadedFile[];
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoverAnexo: (idx: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Exclusões da proposta
        </p>
        <p className="mt-1 text-xs text-amber-900">
          Esses 3 cenários estão FORA da cobertura. Marque o que se aplicar
          e descreva a evidência.
        </p>
        <div className="mt-3 space-y-3">
          <ExclusaoItem
            label="Mudança no escopo da vaga após contratação"
            checked={mudancaEscopo}
            onChange={setMudancaEscopo}
            evidencia={mudancaEscopoEv}
            onEvidenciaChange={setMudancaEscopoEv}
          />
          <ExclusaoItem
            label="Reestruturação / corte de custos do cliente"
            checked={reestruturacao}
            onChange={setReestruturacao}
            evidencia={reestruturacaoEv}
            onEvidenciaChange={setReestruturacaoEv}
          />
          <ExclusaoItem
            label="Falha no onboarding/gestão do cliente"
            checked={falhaOnboarding}
            onChange={setFalhaOnboarding}
            evidencia={falhaOnboardingEv}
            onEvidenciaChange={setFalhaOnboardingEv}
          />
        </div>
      </div>

      <div>
        <p className="label">Provas / anexos</p>
        <p className="-mt-1 mb-2 text-xs text-slate-500">
          Prints, emails, PDFs. Você pode anexar mais de um.
        </p>
        {anexos.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {anexos.map((a, idx) => (
              <li
                key={a.url}
                className="flex items-center gap-2 rounded-lg border border-line/70 bg-slate-50 px-3 py-2 text-sm"
              >
                <Paperclip size={14} className="text-slate-500" />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-medium text-royal hover:underline"
                >
                  {a.nome}
                </a>
                <button
                  type="button"
                  onClick={() => onRemoverAnexo(idx)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Remover anexo"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary w-full justify-center text-xs"
        >
          <Paperclip size={14} />
          {uploading ? "Enviando…" : "Anexar arquivo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}

function Step3Decisao({
  dentro,
  setDentro,
  justificativa,
  setJustificativa,
}: {
  dentro: "sim" | "nao";
  setDentro: (v: "sim" | "nao") => void;
  justificativa: string;
  setJustificativa: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Decisão da triagem fica registrada com sua justificativa. Audit
        trail completo.
      </p>
      <div>
        <p className="label">Decisão *</p>
        <div className="space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
              dentro === "sim"
                ? "border-lima-300 bg-lima-50"
                : "border-line hover:border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="dentro"
              checked={dentro === "sim"}
              onChange={() => setDentro("sim")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Dentro da garantia
              </span>
              <span className="block text-xs text-slate-500">
                Cliente tem direito à reposição. Próximo passo: escolher
                substituto da shortlist ou abrir vaga nova.
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
              dentro === "nao"
                ? "border-red-300 bg-red-50"
                : "border-line hover:border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="dentro"
              checked={dentro === "nao"}
              onChange={() => setDentro("nao")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Fora da garantia
              </span>
              <span className="block text-xs text-slate-500">
                Algum critério de exclusão se aplica. Contratação encerra.
              </span>
            </span>
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="justif" className="label">
          Justificativa *
        </label>
        <textarea
          id="justif"
          required
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          className="input min-h-[80px] resize-y"
          maxLength={2000}
          placeholder="Por que essa decisão? Cite a evidência se for FORA."
        />
      </div>
    </div>
  );
}

function ExclusaoItem({
  label,
  checked,
  onChange,
  evidencia,
  onEvidenciaChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  evidencia: string;
  onEvidenciaChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-900">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="flex-1">{label}</span>
      </label>
      {checked && (
        <textarea
          value={evidencia}
          onChange={(e) => onEvidenciaChange(e.target.value)}
          placeholder="Evidência (link de email, print descrito, fato concreto)"
          className="input mt-2 min-h-[44px] resize-y bg-white text-sm"
          maxLength={2000}
        />
      )}
    </div>
  );
}

// (Gavel import isn't actively used, but keeping for future iteration.)
void Gavel;
