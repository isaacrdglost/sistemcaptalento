"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { acionarGarantia } from "@/app/contratacoes/actions";

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

interface AcionarGarantiaModalProps {
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

export function AcionarGarantiaModal({
  open,
  onClose,
  contratacaoId,
  candidatoNome,
  dataAdmissao,
}: AcionarGarantiaModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [dataSaida, setDataSaida] = useState(todayLocalISODate());
  const [motivo, setMotivo] = useState<MotivoSaida>("pedido_cliente");
  const [detalhe, setDetalhe] = useState("");
  const [mudancaEscopo, setMudancaEscopo] = useState(false);
  const [mudancaEscopoEv, setMudancaEscopoEv] = useState("");
  const [reestruturacao, setReestruturacao] = useState(false);
  const [reestruturacaoEv, setReestruturacaoEv] = useState("");
  const [falhaOnboarding, setFalhaOnboarding] = useState(false);
  const [falhaOnboardingEv, setFalhaOnboardingEv] = useState("");

  useEffect(() => {
    if (!open) return;
    setDataSaida(todayLocalISODate());
    setMotivo("pedido_cliente");
    setDetalhe("");
    setMudancaEscopo(false);
    setMudancaEscopoEv("");
    setReestruturacao(false);
    setReestruturacaoEv("");
    setFalhaOnboarding(false);
    setFalhaOnboardingEv("");
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const result = await acionarGarantia({
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
      });
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      toast.success("Garantia acionada — agora vai pra triagem.");
      router.refresh();
      onClose();
    });
  }

  const dataSaidaInvalida =
    !dataSaida || new Date(`${dataSaida}T12:00:00`) < dataAdmissao;

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
            onClick={() => !submitting && onClose()}
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Acionar garantia
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {candidatoNome}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
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
                  placeholder="Anote o contexto. Vai pra triagem depois."
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Checklist de exclusões da proposta
                </p>
                <p className="mt-1 text-xs text-amber-900">
                  Esses 3 cenários estão FORA da cobertura. Marque o que se
                  aplicar e descreva a evidência — protege na triagem.
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
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line/70 bg-slate-50/50 px-6 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-ghost text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || dataSaidaInvalida}
                className="btn-primary bg-red-600 text-sm hover:bg-red-700"
              >
                <AlertTriangle size={14} />
                {submitting ? "Acionando…" : "Acionar garantia"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
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
