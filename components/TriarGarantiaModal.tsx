"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Gavel, X } from "lucide-react";
import { triarGarantia } from "@/app/contratacoes/actions";

interface TriarGarantiaModalProps {
  open: boolean;
  onClose: () => void;
  contratacaoId: string;
  candidatoNome: string;
}

export function TriarGarantiaModal({
  open,
  onClose,
  contratacaoId,
  candidatoNome,
}: TriarGarantiaModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [dentro, setDentro] = useState<"sim" | "nao">("sim");
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (!open) return;
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const result = await triarGarantia({
        contratacaoId,
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
          ? "Triada como DENTRO. Pode abrir a reposição."
          : "Triada como FORA. Contratação encerrada.",
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
            onClick={() => !submitting && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            className="card relative z-10 w-full max-w-md overflow-hidden p-0"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onSubmit={onSubmit}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Gavel size={18} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Triagem da garantia
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

            <div className="space-y-4 px-6 py-5">
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
                        Cliente tem direito à reposição gratuita.
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
                        Algum critério de exclusão se aplica. Contratação
                        encerra.
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
                disabled={submitting || justificativa.trim().length < 5}
                className="btn-primary text-sm"
              >
                <Gavel size={14} />
                {submitting ? "Salvando…" : "Confirmar decisão"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
