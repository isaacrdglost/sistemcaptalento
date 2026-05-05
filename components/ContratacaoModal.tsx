"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { registrarContratacao } from "@/app/contratacoes/actions";
import { sugerirDataAdmissao } from "@/lib/garantia";

type Modelo = "presencial" | "hibrido" | "remoto";

interface ContratacaoModalProps {
  open: boolean;
  onClose: () => void;
  candidato: {
    id: string;
    nome: string;
  };
  vaga: {
    titulo: string;
    modelo: Modelo | null;
    salarioMin: number | null;
    salarioMax: number | null;
    dataShortlistEntregue?: Date | null;
  };
}

const MODELO_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];

function toLocalISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatSalarioPadrao(
  min: number | null,
  max: number | null,
): string {
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

export function ContratacaoModal({
  open,
  onClose,
  candidato,
  vaga,
}: ContratacaoModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [dataAdmissao, setDataAdmissao] = useState(() =>
    toLocalISODate(sugerirDataAdmissao(vaga.dataShortlistEntregue ?? null)),
  );
  const [cargoSnapshot, setCargoSnapshot] = useState(vaga.titulo);
  const [salarioSnapshot, setSalarioSnapshot] = useState(
    formatSalarioPadrao(vaga.salarioMin, vaga.salarioMax),
  );
  const [modeloSnapshot, setModeloSnapshot] = useState<Modelo>(
    vaga.modelo ?? "presencial",
  );
  const [escopoSnapshot, setEscopoSnapshot] = useState("");
  const [observacoesTermos, setObservacoesTermos] = useState("");
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [evidenciaNome, setEvidenciaNome] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state quando reabrir
  useEffect(() => {
    if (!open) return;
    setDataAdmissao(
      toLocalISODate(sugerirDataAdmissao(vaga.dataShortlistEntregue ?? null)),
    );
    setCargoSnapshot(vaga.titulo);
    setSalarioSnapshot(formatSalarioPadrao(vaga.salarioMin, vaga.salarioMax));
    setModeloSnapshot(vaga.modelo ?? "presencial");
    setEscopoSnapshot("");
    setObservacoesTermos("");
    setEvidenciaUrl(null);
    setEvidenciaNome(null);
    setUploading(false);
    setSubmitting(false);
  }, [
    open,
    vaga.titulo,
    vaga.modelo,
    vaga.salarioMin,
    vaga.salarioMax,
    vaga.dataShortlistEntregue,
  ]);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function removerEvidencia() {
    setEvidenciaUrl(null);
    setEvidenciaNome(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);

    startTransition(async () => {
      const result = await registrarContratacao({
        candidatoId: candidato.id,
        dataAdmissao: new Date(`${dataAdmissao}T12:00:00`),
        admissaoEvidenciaUrl: evidenciaUrl,
        cargoSnapshot,
        salarioSnapshot,
        modeloSnapshot,
        escopoSnapshot,
        observacoesTermos,
      });
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      toast.success("Contratação registrada. Garantia em curso por 30 dias.");
      router.refresh();
      onClose();
    });
  }

  const formInvalid =
    !dataAdmissao ||
    cargoSnapshot.trim().length === 0 ||
    salarioSnapshot.trim().length === 0;

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
              if (!submitting && !uploading) onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="contratacao-titulo"
            className="card relative z-10 w-full max-w-lg overflow-hidden p-0"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={onSubmit}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lima-100 text-lima-700">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h2
                    id="contratacao-titulo"
                    className="text-base font-semibold text-ink"
                  >
                    Marcar como contratado
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {candidato.nome} · {vaga.titulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && !uploading && onClose()}
                className="text-slate-400 transition hover:text-slate-700"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label htmlFor="data-admissao" className="label">
                  Data de admissão *
                </label>
                <input
                  id="data-admissao"
                  type="date"
                  required
                  value={dataAdmissao}
                  onChange={(e) => setDataAdmissao(e.target.value)}
                  className="input"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {vaga.dataShortlistEntregue
                    ? "Sugerido: shortlist + 7 dias. Edite livremente."
                    : "Edite com a data efetiva da admissão."}{" "}
                  Garantia de 30d corridos começa daqui.
                </p>
              </div>

              <div>
                <label className="label">Evidência da admissão (opcional)</label>
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
                      onClick={removerEvidencia}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Remover anexo"
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
                      : "Anexar print/PDF do cliente confirmando"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Recomendado. Vira prova se a data for contestada.
                </p>
              </div>

              <div className="my-2 border-t border-line/70 pt-4">
                <p className="section-label mb-3">
                  Termos congelados (snapshot)
                </p>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="cargo-snap" className="label">
                      Cargo *
                    </label>
                    <input
                      id="cargo-snap"
                      type="text"
                      required
                      value={cargoSnapshot}
                      onChange={(e) => setCargoSnapshot(e.target.value)}
                      className="input"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label htmlFor="salario-snap" className="label">
                      Salário / condições *
                    </label>
                    <input
                      id="salario-snap"
                      type="text"
                      required
                      value={salarioSnapshot}
                      onChange={(e) => setSalarioSnapshot(e.target.value)}
                      className="input"
                      placeholder="Ex: R$ 5.500 + benefícios"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label htmlFor="modelo-snap" className="label">
                      Modelo *
                    </label>
                    <Select
                      id="modelo-snap"
                      value={modeloSnapshot}
                      onChange={(v) => setModeloSnapshot(v as Modelo)}
                      options={MODELO_OPTIONS}
                    />
                  </div>

                  <div>
                    <label htmlFor="escopo-snap" className="label">
                      Escopo da função (opcional)
                    </label>
                    <textarea
                      id="escopo-snap"
                      value={escopoSnapshot}
                      onChange={(e) => setEscopoSnapshot(e.target.value)}
                      className="input min-h-[72px] resize-y"
                      maxLength={2000}
                      placeholder="Resuma as responsabilidades acordadas com o cliente."
                    />
                  </div>

                  <div>
                    <label htmlFor="obs-termos" className="label">
                      Observações (opcional)
                    </label>
                    <textarea
                      id="obs-termos"
                      value={observacoesTermos}
                      onChange={(e) => setObservacoesTermos(e.target.value)}
                      className="input min-h-[60px] resize-y"
                      maxLength={2000}
                      placeholder="Algo combinado por fora? Anote aqui."
                    />
                  </div>
                </div>
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
                disabled={submitting || uploading || formInvalid}
                className="btn-primary text-sm"
              >
                <CheckCircle2 size={14} />
                {submitting ? "Registrando…" : "Registrar contratação"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
