"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { XCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { perderLead } from "@/app/comercial/actions";

interface PerderLeadDialogProps {
  leadId: string | null;
  leadRazaoSocial?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const MOTIVOS_PRESET: string[] = [
  "Sem orçamento",
  "Sem fit",
  "Concorrente",
  "Sem retorno",
  "Cancelou",
  "Outro",
];

export function PerderLeadDialog({
  leadId,
  leadRazaoSocial,
  onClose,
  onSuccess,
}: PerderLeadDialogProps) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [chipAtivo, setChipAtivo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const aberto = leadId !== null;

  useEffect(() => {
    if (!aberto) return;
    setMotivo("");
    setChipAtivo(null);
  }, [aberto, leadId]);

  useEffect(() => {
    if (!aberto) return;
    const id = setTimeout(() => textareaRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isPending) onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto, isPending, onClose]);

  function selecionarChip(opt: string) {
    setChipAtivo(opt);
    if (opt === "Outro") {
      // "Outro" não faz sentido como motivo literal — deixa o campo vazio
      // e foca o textarea pro usuário descrever.
      setMotivo("");
      setTimeout(() => {
        const ta = document.getElementById(
          "perder-motivo",
        ) as HTMLTextAreaElement | null;
        ta?.focus();
      }, 30);
    } else {
      setMotivo(opt);
    }
  }

  function submit() {
    if (!leadId) return;
    const motivoFinal = motivo.trim();
    if (motivoFinal.length < 2) {
      toast.error("Informe um motivo");
      return;
    }
    startTransition(async () => {
      const result = await perderLead(leadId, { motivo: motivoFinal });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Lead marcado como perdido");
      onSuccess?.();
      router.refresh();
      onClose();
    });
  }

  const podeEnviar = motivo.trim().length >= 2 && !isPending;

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              if (!isPending) onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="perder-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-pop"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isPending}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="perder-title"
                  className="text-base font-bold text-ink"
                >
                  Marcar como perdido
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {leadRazaoSocial ? (
                    <>
                      <span className="font-semibold text-ink">
                        {leadRazaoSocial}
                      </span>{" "}
                      sai do funil. Você pode reabrir depois se mudou de ideia.
                    </>
                  ) : (
                    "O lead sai do funil. Você pode reabrir depois se mudou de ideia."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="label">Motivos comuns</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {MOTIVOS_PRESET.map((opt) => {
                    const ativo = chipAtivo === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => selecionarChip(opt)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                          ativo
                            ? "bg-red-600 text-white shadow-xs"
                            : "bg-white text-slate-600 ring-1 ring-inset ring-line hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="perder-motivo" className="label">
                  Detalhes do motivo
                </label>
                <textarea
                  id="perder-motivo"
                  ref={textareaRef}
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    if (chipAtivo && e.target.value !== chipAtivo) {
                      // user editou — perde o "match" do chip
                    }
                  }}
                  rows={3}
                  placeholder="Conte rapidamente o que aconteceu"
                  className="input mt-1.5 resize-none"
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!podeEnviar}
                className="btn-danger"
              >
                {isPending ? "Salvando..." : "Marcar como perdido"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
