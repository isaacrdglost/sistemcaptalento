"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { confirmarPeloCliente } from "@/app/protocolos/actions";

interface ConfirmarClienteModalProps {
  open: boolean;
  onClose: () => void;
  protocoloId: string;
  profissionalNome: string;
}

const VIA_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ConfirmarClienteModal({
  open,
  onClose,
  protocoloId,
  profissionalNome,
}: ConfirmarClienteModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [dataConfirmacao, setDataConfirmacao] = useState(todayISO());
  const [via, setVia] = useState<string>("whatsapp");
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [evidenciaNome, setEvidenciaNome] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDataConfirmacao(todayISO());
    setVia("whatsapp");
    setEvidenciaUrl(null);
    setEvidenciaNome(null);
    setUploading(false);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting && !uploading) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, uploading, onClose]);

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
      setEvidenciaUrl(json.url);
      setEvidenciaNome(json.nomeArquivo);
    } catch {
      toast.error("Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    startTransition(async () => {
      const result = await confirmarPeloCliente({
        protocoloId,
        clienteConfirmouEm: new Date(`${dataConfirmacao}T12:00:00`),
        clienteConfirmacaoVia: via as
          | "email"
          | "whatsapp"
          | "ligacao"
          | "reuniao"
          | "outro",
        clienteConfirmacaoEvidenciaUrl: evidenciaUrl,
      });
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      toast.success("Garantia ATIVADA. Bom trabalho.");
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
            className="card relative z-10 w-full max-w-md overflow-hidden p-0"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onSubmit={onSubmit}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lima-100 text-lima-700">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Confirmar com o cliente
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Reposição de {profissionalNome}
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

            <div className="space-y-4 px-6 py-5">
              <p className="text-xs text-slate-500">
                Quando o cliente confirmar formalmente o pedido de reposição,
                a garantia é ATIVADA e a CapTalento se compromete a entregar
                a reposição.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Data da confirmação *</label>
                  <input
                    type="date"
                    required
                    value={dataConfirmacao}
                    onChange={(e) => setDataConfirmacao(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Via *</label>
                  <Select
                    value={via}
                    onChange={(v) => setVia(v)}
                    options={VIA_OPTIONS}
                  />
                </div>
              </div>

              <div>
                <label className="label">Evidência (opcional)</label>
                {evidenciaUrl ? (
                  <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-slate-50 px-3 py-2 text-sm">
                    <Paperclip size={14} className="text-slate-500" />
                    <a
                      href={evidenciaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate font-medium text-royal hover:underline"
                    >
                      {evidenciaNome ?? "Arquivo enviado"}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenciaUrl(null);
                        setEvidenciaNome(null);
                      }}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary w-full justify-center text-xs"
                  >
                    <Paperclip size={14} />
                    {uploading
                      ? "Enviando…"
                      : "Anexar print/email do cliente confirmando"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line/70 bg-slate-50/50 px-6 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || uploading}
                className="btn-ghost text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="btn-primary text-sm"
              >
                <ShieldCheck size={14} />
                {submitting ? "Ativando…" : "Ativar garantia"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
