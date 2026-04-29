"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Plus, Upload, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { criarTalento, type TalentoInput } from "@/app/talentos/actions";

interface NovoTalentoModalProps {
  triggerLabel?: string;
  triggerClassName?: string;
}

interface FormState {
  nome: string;
  email: string;
  telefone: string;
  linkedinUrl: string;
  cidade: string;
  estado: string;
  senioridade: string;
  area: string;
  tags: string[];
  linkCV: string;
  cvArquivoUrl: string;
  cvNomeArquivo: string;
  notas: string;
}

const EMPTY: FormState = {
  nome: "",
  email: "",
  telefone: "",
  linkedinUrl: "",
  cidade: "",
  estado: "",
  senioridade: "",
  area: "",
  tags: [],
  linkCV: "",
  cvArquivoUrl: "",
  cvNomeArquivo: "",
  notas: "",
};

const SENIORIDADES: Array<{ value: string; label: string }> = [
  { value: "estagio", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "lideranca", label: "Liderança" },
];

type SenioridadeValor = NonNullable<TalentoInput["senioridade"]>;

function maskPhone(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

interface UploadResponse {
  ok?: boolean;
  error?: string;
  url?: string;
  nomeArquivo?: string;
}

export function NovoTalentoModal({
  triggerLabel = "+ Novo talento",
  triggerClassName = "btn-primary",
}: NovoTalentoModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isPending && !uploading) setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isPending, uploading]);

  function reset() {
    setForm(EMPTY);
    setTagInput("");
  }

  function handleClose() {
    if (isPending || uploading) return;
    setOpen(false);
    reset();
  }

  function addTag(raw: string) {
    const valor = raw.trim();
    if (!valor) return;
    if (valor.length > 40) {
      toast.error("Tag não pode ter mais de 40 caracteres");
      return;
    }
    if (form.tags.length >= 20) {
      toast.error("Máximo de 20 tags");
      return;
    }
    if (form.tags.includes(valor)) {
      setTagInput("");
      return;
    }
    setForm((f) => ({ ...f, tags: [...f.tags, valor] }));
    setTagInput("");
  }

  function removerTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && form.tags.length > 0) {
      e.preventDefault();
      setForm((f) => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo maior que 8MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-cv", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as UploadResponse;
      if (!res.ok || !data.ok || !data.url) {
        toast.error(data.error ?? "Erro ao enviar arquivo");
        return;
      }
      setForm((f) => ({
        ...f,
        cvArquivoUrl: data.url ?? "",
        cvNomeArquivo: data.nomeArquivo ?? file.name,
      }));
      toast.success("Currículo enviado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removerArquivo() {
    setForm((f) => ({ ...f, cvArquivoUrl: "", cvNomeArquivo: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      toast.error("Aguarde o upload do arquivo terminar");
      return;
    }
    const nome = form.nome.trim();
    if (!nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    // Adiciona tag pendente no input antes de enviar, se houver
    const tags = tagInput.trim()
      ? form.tags.includes(tagInput.trim())
        ? form.tags
        : [...form.tags, tagInput.trim()]
      : form.tags;

    const senioridadeValor = form.senioridade
      ? (form.senioridade as SenioridadeValor)
      : null;

    const payload: TalentoInput = {
      nome,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      linkedinUrl: form.linkedinUrl.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      senioridade: senioridadeValor,
      area: form.area.trim() || null,
      tags,
      linkCV: form.linkCV.trim() || null,
      cvArquivoUrl: form.cvArquivoUrl || null,
      cvNomeArquivo: form.cvNomeArquivo || null,
      notas: form.notas.trim() || null,
    };

    startTransition(async () => {
      const result = await criarTalento(payload);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Talento cadastrado");
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <Plus size={16} className="shrink-0" />
        <span>{triggerLabel.replace(/^\+\s*/, "")}</span>
      </button>

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
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="novo-talento-title"
              className="relative w-full max-w-xl rounded-2xl bg-white shadow-pop max-h-[90vh] flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                aria-label="Fechar"
                onClick={handleClose}
                className="absolute right-3 top-3 z-10 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-3 border-b border-line/70 p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lima-50 text-lima-700 ring-1 ring-inset ring-lima-100">
                  <UserPlus size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="section-label mb-0.5">Pool</div>
                  <h2
                    id="novo-talento-title"
                    className="text-h3 text-ink"
                  >
                    Novo talento
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Cadastre um profissional no banco para consulta em novas vagas.
                  </p>
                </div>
              </div>

              <div className="relative flex-1 overflow-y-auto">
                <div
                  aria-hidden
                  className="pointer-events-none sticky top-0 -mb-6 h-6 bg-gradient-to-b from-white to-transparent z-[1]"
                />
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 p-6"
              >
                <div>
                  <label htmlFor="tal-nome" className="label">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tal-nome"
                    ref={firstFieldRef}
                    type="text"
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    disabled={isPending}
                    required
                    className="input"
                    placeholder="Nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tal-email" className="label">
                      Email
                    </label>
                    <input
                      id="tal-email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      disabled={isPending}
                      className="input"
                      placeholder="pessoa@exemplo.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="tal-telefone" className="label">
                      Telefone
                    </label>
                    <input
                      id="tal-telefone"
                      type="tel"
                      value={form.telefone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          telefone: maskPhone(e.target.value),
                        }))
                      }
                      disabled={isPending}
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tal-linkedin" className="label">
                    LinkedIn
                  </label>
                  <input
                    id="tal-linkedin"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, linkedinUrl: e.target.value }))
                    }
                    disabled={isPending}
                    className="input"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="grid grid-cols-[1fr_80px] gap-4">
                  <div>
                    <label htmlFor="tal-cidade" className="label">
                      Cidade
                    </label>
                    <input
                      id="tal-cidade"
                      type="text"
                      value={form.cidade}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cidade: e.target.value }))
                      }
                      disabled={isPending}
                      className="input"
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <label htmlFor="tal-estado" className="label">
                      UF
                    </label>
                    <input
                      id="tal-estado"
                      type="text"
                      value={form.estado}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          estado: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, 2),
                        }))
                      }
                      disabled={isPending}
                      maxLength={2}
                      className="input"
                      placeholder="SP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tal-senioridade" className="label">
                      Senioridade
                    </label>
                    <select
                      id="tal-senioridade"
                      value={form.senioridade}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, senioridade: e.target.value }))
                      }
                      disabled={isPending}
                      className="input"
                    >
                      <option value="">Não informada</option>
                      {SENIORIDADES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tal-area" className="label">
                      Área
                    </label>
                    <input
                      id="tal-area"
                      type="text"
                      value={form.area}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, area: e.target.value }))
                      }
                      disabled={isPending}
                      className="input"
                      placeholder="Tecnologia, Vendas…"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tal-tags" className="label">
                    Tags
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-royal-100">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removerTag(tag)}
                          aria-label={`Remover ${tag}`}
                          className="text-slate-400 transition hover:text-ink"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      id="tal-tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => {
                        if (tagInput.trim()) addTag(tagInput);
                      }}
                      disabled={isPending}
                      placeholder={
                        form.tags.length === 0
                          ? "Digite e pressione Enter"
                          : ""
                      }
                      className="flex-1 min-w-[120px] border-0 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Pressione Enter ou vírgula para adicionar. Backspace remove
                    a última.
                  </p>
                </div>

                <div>
                  <label className="label">Currículo</label>
                  <div className="flex flex-col gap-2">
                    {form.cvArquivoUrl ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-slate-50 px-3 py-2">
                        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-ink">
                          <FileText size={14} className="shrink-0 text-royal" />
                          <span className="truncate">
                            {form.cvNomeArquivo || "Currículo enviado"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={removerArquivo}
                          disabled={isPending}
                          className="text-xs text-slate-400 transition hover:text-red-600"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                          onChange={handleFileChange}
                          disabled={isPending || uploading}
                          className="hidden"
                          id="tal-cv-file"
                        />
                        <label
                          htmlFor="tal-cv-file"
                          className={`btn-secondary cursor-pointer ${
                            uploading || isPending
                              ? "pointer-events-none opacity-60"
                              : ""
                          }`}
                        >
                          {uploading ? (
                            <>
                              <Loader2
                                size={14}
                                className="shrink-0 animate-spin"
                              />
                              <span>Enviando…</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} className="shrink-0" />
                              <span>Enviar CV (PDF, DOC, imagem)</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}

                    <div>
                      <label htmlFor="tal-linkcv" className="label text-xs">
                        Ou cole um link externo (Google Drive, etc.)
                      </label>
                      <input
                        id="tal-linkcv"
                        type="url"
                        value={form.linkCV}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, linkCV: e.target.value }))
                        }
                        disabled={isPending}
                        className="input"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="tal-notas" className="label">
                    Notas
                  </label>
                  <textarea
                    id="tal-notas"
                    value={form.notas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notas: e.target.value }))
                    }
                    disabled={isPending}
                    rows={3}
                    className="input resize-y"
                    placeholder="Impressões, áreas de interesse, histórico…"
                  />
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending || uploading}
                    className="btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || uploading}
                    className="btn-primary"
                  >
                    {isPending ? "Cadastrando…" : "Cadastrar talento"}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
