"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { agendarFollowup } from "@/app/comercial/actions";

interface AgendarFollowupModalProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDateTimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Sugestao {
  label: string;
  build: () => Date;
}

const SUGESTOES: Sugestao[] = [
  {
    label: "Daqui 1 hora",
    build: () => {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      return d;
    },
  },
  {
    label: "Amanhã 9h",
    build: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Em 3 dias",
    build: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Próxima semana",
    build: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

export function AgendarFollowupModal({
  leadId,
  open,
  onClose,
}: AgendarFollowupModalProps) {
  const router = useRouter();
  const [quando, setQuando] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return formatDateTimeLocal(d);
  });
  const [descricao, setDescricao] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setQuando(formatDateTimeLocal(d));
    setDescricao("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 60);
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
  }, [open, isPending, onClose]);

  function aplicarSugestao(sug: Sugestao) {
    setQuando(formatDateTimeLocal(sug.build()));
  }

  const podeEnviar =
    quando.length > 0 && descricao.trim().length >= 2 && !isPending;

  function submit() {
    if (!podeEnviar) return;
    const data = new Date(quando);
    if (Number.isNaN(data.getTime())) {
      toast.error("Data inválida");
      return;
    }
    if (data.getTime() < Date.now() - 60_000) {
      toast.error("A data não pode ser no passado");
      return;
    }
    startTransition(async () => {
      const result = await agendarFollowup(leadId, {
        agendadoPara: data,
        descricao: descricao.trim(),
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up agendado");
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
            onClick={() => {
              if (!isPending) onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agendar-followup-title"
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Bell size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="agendar-followup-title"
                  className="text-base font-bold text-ink"
                >
                  Agendar follow-up
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Marque um lembrete para a próxima ação neste lead.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <span className="label">Sugestões rápidas</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SUGESTOES.map((sug) => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => aplicarSugestao(sug)}
                      className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-line transition hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-100"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="followup-quando-modal" className="label">
                  Quando
                </label>
                <input
                  id="followup-quando-modal"
                  ref={inputRef}
                  type="datetime-local"
                  value={quando}
                  onChange={(e) => setQuando(e.target.value)}
                  className="input mt-1.5"
                />
              </div>

              <div>
                <label
                  htmlFor="followup-descricao-modal"
                  className="label"
                >
                  O que fazer
                </label>
                <input
                  id="followup-descricao-modal"
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Retornar com proposta revisada"
                  maxLength={200}
                  className="input mt-1.5"
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
                className="btn-primary"
              >
                {isPending ? "Agendando..." : "Agendar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
