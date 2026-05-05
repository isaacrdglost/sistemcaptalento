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
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { abrirProtocolo } from "@/app/protocolos/actions";

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

type Modelo = "presencial" | "hibrido" | "remoto";

export interface CandidatoOption {
  id: string;
  nome: string;
}

interface AbrirProtocoloModalProps {
  open: boolean;
  onClose: () => void;
  vagaId: string;
  vagaTitulo: string;
  vagaModelo: Modelo | null;
  vagaSalarioMin: number | null;
  vagaSalarioMax: number | null;
  /** Candidatos da própria vaga (a "shortlist") — recrutadora pode marcar
   * que o profissional saiu foi um deles. Senão preenche nome livre. */
  candidatosDaVaga: CandidatoOption[];
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
    description: "Excluído pela proposta",
  },
  {
    value: "mudanca_escopo",
    label: "Mudança de escopo",
    description: "Excluído pela proposta",
  },
  {
    value: "falha_onboarding_cliente",
    label: "Falha de onboarding do cliente",
    description: "Excluído pela proposta",
  },
  { value: "outro", label: "Outro" },
];

const MODELO_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatSalarioPadrao(min: number | null, max: number | null): string {
  if (min == null && max == null) return "";
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  if (min != null && max != null) return `${fmt(min)} a ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

interface UploadedFile {
  url: string;
  nome: string;
}

type Step = 1 | 2 | 3 | 4;

export function AbrirProtocoloModal({
  open,
  onClose,
  vagaId,
  vagaTitulo,
  vagaModelo,
  vagaSalarioMin,
  vagaSalarioMax,
  candidatosDaVaga,
}: AbrirProtocoloModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Profissional + termos
  const [candidatoId, setCandidatoId] = useState<string>("__livre__");
  const [profissionalNome, setProfissionalNome] = useState("");
  const [cargoSnapshot, setCargoSnapshot] = useState(vagaTitulo);
  const [salarioSnapshot, setSalarioSnapshot] = useState(
    formatSalarioPadrao(vagaSalarioMin, vagaSalarioMax),
  );
  const [modeloSnapshot, setModeloSnapshot] = useState<Modelo>(
    vagaModelo ?? "presencial",
  );
  const [escopoSnapshot, setEscopoSnapshot] = useState("");
  const [dataAdmissaoOriginal, setDataAdmissaoOriginal] = useState("");

  // Step 2 — Saída
  const [dataSaida, setDataSaida] = useState(todayISO());
  const [motivo, setMotivo] = useState<MotivoSaida>("pedido_cliente");
  const [detalhe, setDetalhe] = useState("");

  // Step 3 — Exclusões + provas
  const [mudancaEscopo, setMudancaEscopo] = useState(false);
  const [mudancaEscopoEv, setMudancaEscopoEv] = useState("");
  const [reestruturacao, setReestruturacao] = useState(false);
  const [reestruturacaoEv, setReestruturacaoEv] = useState("");
  const [falhaOnboarding, setFalhaOnboarding] = useState(false);
  const [falhaOnboardingEv, setFalhaOnboardingEv] = useState("");
  const [anexos, setAnexos] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — Decisão preliminar
  const [dentro, setDentro] = useState<"sim" | "nao">("sim");
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCandidatoId(candidatosDaVaga[0]?.id ?? "__livre__");
    setProfissionalNome(candidatosDaVaga[0]?.nome ?? "");
    setCargoSnapshot(vagaTitulo);
    setSalarioSnapshot(formatSalarioPadrao(vagaSalarioMin, vagaSalarioMax));
    setModeloSnapshot(vagaModelo ?? "presencial");
    setEscopoSnapshot("");
    setDataAdmissaoOriginal("");
    setDataSaida(todayISO());
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
  }, [
    open,
    vagaTitulo,
    vagaModelo,
    vagaSalarioMin,
    vagaSalarioMax,
    candidatosDaVaga,
  ]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting && !uploading) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, uploading, onClose]);

  // Quando troca o candidato, atualiza nome
  useEffect(() => {
    if (candidatoId === "__livre__") return;
    const c = candidatosDaVaga.find((x) => x.id === candidatoId);
    if (c) setProfissionalNome(c.nome);
  }, [candidatoId, candidatosDaVaga]);

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
    for (const f of Array.from(files)) void handleFile(f);
    e.target.value = "";
  }

  const step1Ok = profissionalNome.trim().length >= 2 && cargoSnapshot.trim().length > 0;
  const step2Ok = !!dataSaida;
  const step3Ok = true;
  const step4Ok = justificativa.trim().length >= 5;

  function avancar() {
    if (step === 1 && step1Ok) setStep(2);
    else if (step === 2 && step2Ok) setStep(3);
    else if (step === 3 && step3Ok) setStep(4);
  }
  function voltar() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !step4Ok) return;
    setSubmitting(true);
    startTransition(async () => {
      const result = await abrirProtocolo({
        vagaId,
        profissionalSaiuCandidatoId:
          candidatoId === "__livre__" ? null : candidatoId,
        profissionalSaiuNome: profissionalNome,
        cargoSnapshot,
        salarioSnapshot,
        modeloSnapshot,
        escopoSnapshot,
        dataAdmissaoOriginal: dataAdmissaoOriginal
          ? new Date(`${dataAdmissaoOriginal}T12:00:00`)
          : null,
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
        triagemJustificativa: justificativa,
      });
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      toast.success(
        dentro === "sim"
          ? "Protocolo aberto · aguardando confirmação do cliente"
          : "Protocolo aberto · FORA da garantia, contratação encerrada",
      );
      router.refresh();
      onClose();
    });
  }

  const candidatosOptions = [
    ...candidatosDaVaga.map((c) => ({ value: c.id, label: c.nome })),
    { value: "__livre__", label: "Outro / nome livre" },
  ];

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
                    Abrir protocolo de reposição
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {vagaTitulo}
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
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Quem saiu? Pode escolher um candidato da shortlist ou
                    digitar o nome livre se a contratação foi por fora da
                    nossa shortlist.
                  </p>
                  <div>
                    <label className="label">Profissional que saiu *</label>
                    <Select
                      value={candidatoId}
                      onChange={(v) => setCandidatoId(v)}
                      options={candidatosOptions}
                    />
                  </div>
                  <div>
                    <label htmlFor="prof-nome" className="label">
                      Nome do profissional *
                    </label>
                    <input
                      id="prof-nome"
                      type="text"
                      required
                      value={profissionalNome}
                      onChange={(e) => setProfissionalNome(e.target.value)}
                      className="input"
                      maxLength={200}
                      disabled={candidatoId !== "__livre__"}
                    />
                  </div>
                  <div className="rounded-xl border border-line bg-slate-50/40 p-3">
                    <p className="section-label mb-3">
                      Termos da contratação que terminou
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="label">Cargo *</label>
                        <input
                          type="text"
                          required
                          value={cargoSnapshot}
                          onChange={(e) => setCargoSnapshot(e.target.value)}
                          className="input"
                          maxLength={200}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label">Salário</label>
                          <input
                            type="text"
                            value={salarioSnapshot}
                            onChange={(e) => setSalarioSnapshot(e.target.value)}
                            className="input"
                            placeholder="R$ 5.500"
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <label className="label">Modelo</label>
                          <Select
                            value={modeloSnapshot}
                            onChange={(v) => setModeloSnapshot(v as Modelo)}
                            options={MODELO_OPTIONS}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Data de admissão original</label>
                        <input
                          type="date"
                          value={dataAdmissaoOriginal}
                          onChange={(e) =>
                            setDataAdmissaoOriginal(e.target.value)
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Escopo (opcional)</label>
                        <textarea
                          value={escopoSnapshot}
                          onChange={(e) => setEscopoSnapshot(e.target.value)}
                          className="input min-h-[60px] resize-y"
                          maxLength={2000}
                          placeholder="Resuma as responsabilidades acordadas."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Quando saiu e por quê.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Data da saída *</label>
                      <input
                        type="date"
                        required
                        value={dataSaida}
                        onChange={(e) => setDataSaida(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Motivo declarado *</label>
                      <Select
                        value={motivo}
                        onChange={(v) => setMotivo(v as MotivoSaida)}
                        options={MOTIVO_OPTIONS}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Detalhe do que o cliente falou</label>
                    <textarea
                      value={detalhe}
                      onChange={(e) => setDetalhe(e.target.value)}
                      className="input min-h-[80px] resize-y"
                      maxLength={2000}
                      placeholder="Anote o contexto. Vai ficar registrado no protocolo."
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Exclusões da proposta
                    </p>
                    <p className="mt-1 text-xs text-amber-900">
                      Esses 3 cenários estão FORA da cobertura. Marque o que
                      se aplicar e descreva a evidência.
                    </p>
                    <div className="mt-3 space-y-3">
                      <ExclusaoItem
                        label="Mudança de escopo após contratação"
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
                              onClick={() =>
                                setAnexos((p) => p.filter((_, i) => i !== idx))
                              }
                              className="text-slate-400 hover:text-red-500"
                              aria-label="Remover"
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
                      {uploading ? "Enviando…" : "Anexar arquivo (múltiplos OK)"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Triagem interna. Se DENTRO, vai pra confirmação do
                    cliente. Se FORA, encerra direto com justificativa.
                  </p>
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
                          Vai pra confirmação do cliente. Quando ele
                          confirmar, garantia é ATIVADA.
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
                          Algum critério de exclusão se aplica. Encerra
                          o protocolo.
                        </span>
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="label">Justificativa *</label>
                    <textarea
                      required
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className="input min-h-[80px] resize-y"
                      maxLength={2000}
                      placeholder="Por que essa decisão? Cite a evidência."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line/70 bg-slate-50/50 px-6 py-3">
              <button
                type="button"
                onClick={step === 1 ? onClose : voltar}
                disabled={submitting}
                className="btn-ghost text-sm"
              >
                {step === 1 ? (
                  "Cancelar"
                ) : (
                  <>
                    <ArrowLeft size={14} />
                    Voltar
                  </>
                )}
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={avancar}
                  disabled={
                    (step === 1 && !step1Ok) ||
                    (step === 2 && !step2Ok) ||
                    (step === 3 && !step3Ok) ||
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
                  disabled={submitting || uploading || !step4Ok}
                  className={`btn-primary text-sm ${
                    dentro === "sim" ? "" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {dentro === "sim" ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  {submitting
                    ? "Salvando…"
                    : dentro === "sim"
                      ? "Abrir · aguardar cliente"
                      : "Encerrar · FORA da garantia"}
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
    { n: 1, label: "Profissional" },
    { n: 2, label: "Saída" },
    { n: 3, label: "Provas" },
    { n: 4, label: "Decisão" },
  ];
  return (
    <div className="flex items-center gap-1.5 border-b border-line/70 px-6 py-3 text-xs">
      {items.map((it, i) => {
        const ativo = step === it.n;
        const completo = step > it.n;
        return (
          <div key={it.n} className="flex flex-1 items-center gap-1.5">
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
              <span className="ml-0.5 hidden h-px flex-1 bg-line sm:block" />
            )}
          </div>
        );
      })}
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
