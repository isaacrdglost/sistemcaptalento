"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import {
  atualizarTemplate,
  criarTemplate,
  type TemplateInput,
} from "@/app/admin/templates-actions";

export type CanalTemplate = "whatsapp" | "email";

export interface TemplateEditavel {
  id: string;
  nome: string;
  canal: CanalTemplate;
  assunto: string | null;
  corpo: string;
  ordem: number;
  ativo: boolean;
}

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  template?: TemplateEditavel;
  canalDefault?: CanalTemplate;
}

const CANAL_OPCOES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

interface FormState {
  nome: string;
  canal: CanalTemplate;
  assunto: string;
  corpo: string;
  ordem: string;
  ativo: boolean;
}

function initialState(
  template?: TemplateEditavel,
  canalDefault: CanalTemplate = "whatsapp",
): FormState {
  if (template) {
    return {
      nome: template.nome,
      canal: template.canal,
      assunto: template.assunto ?? "",
      corpo: template.corpo,
      ordem: String(template.ordem),
      ativo: template.ativo,
    };
  }
  return {
    nome: "",
    canal: canalDefault,
    assunto: "",
    corpo: "",
    ordem: "0",
    ativo: true,
  };
}

/**
 * Modal de criar/editar template de mensagem. Em modo edit o canal fica
 * fixo (mudar canal de um template existente bagunça o uso histórico).
 * Quando canal=email o assunto é obrigatório.
 */
export function TemplateFormModal({
  open,
  onClose,
  template,
  canalDefault = "whatsapp",
}: TemplateFormModalProps) {
  const router = useRouter();
  const editando = !!template;
  const [state, setState] = useState<FormState>(() =>
    initialState(template, canalDefault),
  );
  const [isPending, startTransition] = useTransition();
  const nomeRef = useRef<HTMLInputElement | null>(null);

  // Sempre que abrir, resetar estado pra refletir o template atual / canal default
  useEffect(() => {
    if (!open) return;
    setState(initialState(template, canalDefault));
    const id = setTimeout(() => nomeRef.current?.focus(), 60);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template, canalDefault]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload(): TemplateInput {
    const ordemNum = Number.parseInt(state.ordem, 10);
    return {
      nome: state.nome.trim(),
      canal: state.canal,
      assunto:
        state.canal === "email" ? state.assunto.trim() || null : null,
      corpo: state.corpo.trim(),
      ordem: Number.isFinite(ordemNum) && ordemNum >= 0 ? ordemNum : 0,
      ativo: state.ativo,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    if (state.nome.trim().length < 2) {
      toast.error("Nome obrigatório");
      return;
    }
    if (state.corpo.trim().length < 2) {
      toast.error("Corpo obrigatório");
      return;
    }
    if (state.canal === "email" && state.assunto.trim().length < 1) {
      toast.error("Assunto é obrigatório pra templates de email");
      return;
    }

    const payload = buildPayload();

    startTransition(async () => {
      const result = editando
        ? await atualizarTemplate(template!.id, payload)
        : await criarTemplate(payload);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        editando ? "Template atualizado" : "Template criado",
      );
      router.refresh();
      onClose();
    });
  }

  const tituloModal = editando ? "Editar template" : "Novo template";
  const submitLabel = isPending
    ? editando
      ? "Salvando…"
      : "Criando…"
    : editando
      ? "Salvar alterações"
      : "Criar template";

  const Icone = state.canal === "whatsapp" ? MessageCircle : Mail;

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
            aria-labelledby="template-modal-title"
            className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-pop"
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
                <Icone size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="template-modal-title"
                  className="text-base font-bold text-ink"
                >
                  {tituloModal}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Mensagem pré-formatada usada pelo comercial. Use
                  variáveis pra personalizar.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="template-nome" className="label">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  id="template-nome"
                  ref={nomeRef}
                  type="text"
                  value={state.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  disabled={isPending}
                  required
                  maxLength={120}
                  placeholder="Ex.: Apresentação inicial WhatsApp"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="template-canal" className="label">
                    Canal <span className="text-red-500">*</span>
                  </label>
                  <Select
                    id="template-canal"
                    value={state.canal}
                    onChange={(v) => update("canal", v as CanalTemplate)}
                    disabled={editando || isPending}
                    options={CANAL_OPCOES}
                    ariaLabel="Canal do template"
                  />
                  {editando ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Canal não pode ser alterado depois de criado.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="template-ordem" className="label">
                    Ordem
                  </label>
                  <input
                    id="template-ordem"
                    type="number"
                    min={0}
                    max={9999}
                    value={state.ordem}
                    onChange={(e) => update("ordem", e.target.value)}
                    disabled={isPending}
                    className="input"
                  />
                </div>
              </div>

              {state.canal === "email" ? (
                <div>
                  <label htmlFor="template-assunto" className="label">
                    Assunto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="template-assunto"
                    type="text"
                    value={state.assunto}
                    onChange={(e) => update("assunto", e.target.value)}
                    disabled={isPending}
                    required
                    maxLength={200}
                    placeholder="Apresentação CapTalento — {{empresa}}"
                    className="input"
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor="template-corpo" className="label">
                  Corpo <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="template-corpo"
                  value={state.corpo}
                  onChange={(e) => update("corpo", e.target.value)}
                  disabled={isPending}
                  required
                  minLength={2}
                  maxLength={10000}
                  rows={8}
                  placeholder="Olá {{contatoNome}}, tudo bem?…"
                  className="input resize-y font-mono text-[13px]"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Variáveis suportadas:{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {"{{nome}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {"{{empresa}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {"{{contatoNome}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {"{{cargoInteresse}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {"{{recrutadora}}"}
                  </code>
                  .
                </p>
              </div>

              <div className="rounded-xl border border-line/70 bg-slate-50/50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.ativo}
                    onChange={(e) => update("ativo", e.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 h-4 w-4 rounded border-line text-royal focus:ring-royal-200"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">
                      Ativo
                    </span>
                    <span className="block text-xs text-slate-500">
                      Templates inativos não aparecem pro comercial.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
