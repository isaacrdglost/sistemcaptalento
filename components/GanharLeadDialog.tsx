"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ganharLead } from "@/app/comercial/actions";

interface GanharLeadDialogProps {
  leadId: string | null;
  leadRazaoSocial?: string;
  onClose: () => void;
  onSuccess?: (clienteId: string) => void;
}

type DialogState =
  | { kind: "idle" }
  | {
      kind: "awaiting_dedup";
      clienteIdExistente: string;
      clienteRazaoSocial: string;
    }
  | { kind: "submitting" };

export function GanharLeadDialog({
  leadId,
  leadRazaoSocial,
  onClose,
  onSuccess,
}: GanharLeadDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<DialogState>({ kind: "idle" });
  const [, startTransition] = useTransition();
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const aberto = leadId !== null;

  // Reset state quando o dialog abre/fecha
  useEffect(() => {
    if (!aberto) return;
    setState({ kind: "idle" });
  }, [aberto, leadId]);

  // Atalhos de teclado
  useEffect(() => {
    if (!aberto) return;
    const id = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto, onClose]);

  function executarGanho(input: {
    clienteIdExistente?: string;
    confirmarDuplicado?: boolean;
  }) {
    if (!leadId) return;
    setState({ kind: "submitting" });
    startTransition(async () => {
      const result = await ganharLead(leadId, input);
      if ("error" in result) {
        toast.error(result.error);
        setState({ kind: "idle" });
        return;
      }
      if ("ok" in result && result.ok === false) {
        // duplicate
        setState({
          kind: "awaiting_dedup",
          clienteIdExistente: result.clienteIdExistente,
          clienteRazaoSocial: result.clienteRazaoSocial,
        });
        return;
      }
      if (result.ok === true) {
        toast.success(
          result.jaExistia
            ? "Lead vinculado a cliente existente"
            : "Lead convertido em cliente",
        );
        onSuccess?.(result.clienteId);
        router.refresh();
        onClose();
      }
    });
  }

  const submitting = state.kind === "submitting";

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
              if (!submitting) onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ganhar-title"
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
              disabled={submitting}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lima-50 text-lima-600">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="ganhar-title"
                  className="text-base font-bold text-ink"
                >
                  {state.kind === "awaiting_dedup"
                    ? "Cliente duplicado encontrado"
                    : "Marcar como ganho"}
                </h2>
                {state.kind === "awaiting_dedup" ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Já existe um cliente{" "}
                    <span className="font-semibold text-ink">
                      &quot;{state.clienteRazaoSocial}&quot;
                    </span>{" "}
                    com o mesmo CNPJ. O que fazer?
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    Vamos converter{" "}
                    {leadRazaoSocial ? (
                      <span className="font-semibold text-ink">
                        &quot;{leadRazaoSocial}&quot;
                      </span>
                    ) : (
                      "este lead"
                    )}{" "}
                    em cliente. Os dados do lead serão copiados — você pode
                    ajustá-los depois em /clientes.
                  </p>
                )}
              </div>
            </div>

            {state.kind === "awaiting_dedup" ? (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  ref={confirmBtnRef}
                  onClick={() =>
                    executarGanho({
                      clienteIdExistente: state.clienteIdExistente,
                    })
                  }
                  className="btn-primary w-full"
                >
                  Vincular ao cliente existente
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executarGanho({ confirmarDuplicado: true })
                  }
                  className="btn-secondary w-full"
                >
                  Criar cliente novo mesmo assim
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost w-full"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  ref={confirmBtnRef}
                  onClick={() => executarGanho({})}
                  disabled={submitting}
                  className="btn-lima"
                >
                  {submitting ? "Processando..." : "Confirmar e criar cliente"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
