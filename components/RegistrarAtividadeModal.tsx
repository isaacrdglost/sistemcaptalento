"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  X,
  type LucideIcon,
} from "lucide-react";
import { registrarAtividade } from "@/app/comercial/actions";

type TipoAtividadeManual = "ligacao" | "email" | "reuniao" | "whatsapp" | "nota";

interface RegistrarAtividadeModalProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
}

interface TipoOption {
  value: TipoAtividadeManual;
  label: string;
  Icon: LucideIcon;
  placeholder: string;
}

const TIPOS: TipoOption[] = [
  {
    value: "ligacao",
    label: "Ligação",
    Icon: Phone,
    placeholder:
      "Conversamos sobre o projeto X. Cliente pediu proposta até segunda.",
  },
  {
    value: "email",
    label: "Email",
    Icon: Mail,
    placeholder: "Enviei o email com a apresentação institucional.",
  },
  {
    value: "reuniao",
    label: "Reunião",
    Icon: CalendarCheck,
    placeholder: "Reunião de kick-off com o time. Definimos próximos passos.",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    Icon: MessageCircle,
    placeholder: "Mandei o orçamento pelo WhatsApp. Aguardando retorno.",
  },
  {
    value: "nota",
    label: "Nota",
    Icon: StickyNote,
    placeholder: "Observação interna sobre o lead.",
  },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function defaultDateTimeLocal(offsetHours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RegistrarAtividadeModal({
  leadId,
  open,
  onClose,
}: RegistrarAtividadeModalProps) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoAtividadeManual>("ligacao");
  const [descricao, setDescricao] = useState("");
  const [agendarFollowup, setAgendarFollowup] = useState(false);
  const [followupQuando, setFollowupQuando] = useState<string>(() =>
    defaultDateTimeLocal(24),
  );
  const [followupDescricao, setFollowupDescricao] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTipo("ligacao");
    setDescricao("");
    setAgendarFollowup(false);
    setFollowupQuando(defaultDateTimeLocal(24));
    setFollowupDescricao("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, isPending, onClose]);

  const tipoSelecionado = TIPOS.find((t) => t.value === tipo) ?? TIPOS[0];
  const podeEnviar =
    descricao.trim().length >= 2 &&
    (!agendarFollowup ||
      (followupQuando.length > 0 && followupDescricao.trim().length >= 2)) &&
    !isPending;

  function submit() {
    if (!podeEnviar) return;
    let proximoFollowup: {
      agendadoPara: Date;
      descricao: string;
    } | null = null;
    if (agendarFollowup) {
      const data = new Date(followupQuando);
      if (Number.isNaN(data.getTime())) {
        toast.error("Data do follow-up inválida");
        return;
      }
      if (data.getTime() < Date.now() - 60_000) {
        toast.error("A data do follow-up não pode ser no passado");
        return;
      }
      proximoFollowup = {
        agendadoPara: data,
        descricao: followupDescricao.trim(),
      };
    }
    startTransition(async () => {
      const result = await registrarAtividade(leadId, {
        tipo,
        descricao: descricao.trim(),
        proximoFollowup,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        proximoFollowup
          ? "Atividade registrada e follow-up agendado"
          : "Atividade registrada",
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
            aria-labelledby="registrar-atividade-title"
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-pop"
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal-50 text-royal-600">
                <tipoSelecionado.Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="registrar-atividade-title"
                  className="text-base font-bold text-ink"
                >
                  Registrar atividade
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Documente o que aconteceu com este lead pra manter o
                  histórico.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <span className="label">Tipo</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TIPOS.map((t) => {
                    const ativo = tipo === t.value;
                    const Icon = t.Icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTipo(t.value)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          ativo
                            ? "bg-royal text-white shadow-pop"
                            : "bg-white text-slate-600 ring-1 ring-inset ring-line hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={12} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="registrar-atividade-descricao"
                  className="label"
                >
                  Descrição
                </label>
                <textarea
                  id="registrar-atividade-descricao"
                  ref={textareaRef}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                  placeholder={tipoSelecionado.placeholder}
                  className="input mt-1.5 resize-none"
                  required
                  minLength={2}
                  maxLength={5000}
                />
              </div>

              <div className="rounded-xl border border-line/70 bg-slate-50/50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agendarFollowup}
                    onChange={(e) => setAgendarFollowup(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-royal focus:ring-royal-200"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">
                      Agendar próximo follow-up junto
                    </span>
                    <span className="block text-xs text-slate-500">
                      Garante que a próxima ação não vai cair no esquecimento.
                    </span>
                  </span>
                </label>

                {agendarFollowup ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label
                        htmlFor="followup-quando"
                        className="label"
                      >
                        Quando
                      </label>
                      <input
                        id="followup-quando"
                        type="datetime-local"
                        value={followupQuando}
                        onChange={(e) => setFollowupQuando(e.target.value)}
                        className="input mt-1.5"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="followup-descricao"
                        className="label"
                      >
                        O que fazer
                      </label>
                      <input
                        id="followup-descricao"
                        type="text"
                        value={followupDescricao}
                        onChange={(e) =>
                          setFollowupDescricao(e.target.value)
                        }
                        placeholder="Retornar ligação para fechar proposta"
                        maxLength={200}
                        className="input mt-1.5"
                      />
                    </div>
                  </div>
                ) : null}
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
                {isPending ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
