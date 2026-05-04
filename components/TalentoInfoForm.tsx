"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Talento } from "@prisma/client";
import {
  atualizarTalento,
  type TalentoInput,
} from "@/app/talentos/actions";
import { Select } from "@/components/ui/Select";

interface TalentoInfoFormProps {
  talento: Talento;
}

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

export function TalentoInfoForm({ talento }: TalentoInfoFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nome, setNome] = useState(talento.nome);
  const [email, setEmail] = useState(talento.email ?? "");
  const [telefone, setTelefone] = useState(
    talento.telefone ? maskPhone(talento.telefone) : "",
  );
  const [linkedinUrl, setLinkedinUrl] = useState(talento.linkedinUrl ?? "");
  const [cidade, setCidade] = useState(talento.cidade ?? "");
  const [estado, setEstado] = useState(talento.estado ?? "");
  const [senioridade, setSenioridade] = useState<string>(
    talento.senioridade ?? "",
  );
  const [area, setArea] = useState(talento.area ?? "");
  const [tags, setTags] = useState<string[]>(talento.tags);
  const [tagInput, setTagInput] = useState("");
  const [linkCV, setLinkCV] = useState(talento.linkCV ?? "");
  const [cvArquivoUrl, setCvArquivoUrl] = useState(talento.cvArquivoUrl ?? "");
  const [cvNomeArquivo, setCvNomeArquivo] = useState(
    talento.cvNomeArquivo ?? "",
  );
  const [notas, setNotas] = useState(talento.notas ?? "");

  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addTag(raw: string) {
    const valor = raw.trim();
    if (!valor) return;
    if (valor.length > 40) {
      toast.error("Tag não pode ter mais de 40 caracteres");
      return;
    }
    if (tags.length >= 20) {
      toast.error("Máximo de 20 tags");
      return;
    }
    if (tags.includes(valor)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, valor]);
    setTagInput("");
  }

  function removerTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      e.preventDefault();
      setTags((prev) => prev.slice(0, -1));
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
      setCvArquivoUrl(data.url ?? "");
      setCvNomeArquivo(data.nomeArquivo ?? file.name);
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
    setCvArquivoUrl("");
    setCvNomeArquivo("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      toast.error("Aguarde o upload do arquivo terminar");
      return;
    }
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast.error("Nome é obrigatório");
      return;
    }

    const tagsFinal = tagInput.trim()
      ? tags.includes(tagInput.trim())
        ? tags
        : [...tags, tagInput.trim()]
      : tags;

    const senioridadeValor = senioridade
      ? (senioridade as SenioridadeValor)
      : null;

    const payload: TalentoInput = {
      nome: nomeTrim,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      linkedinUrl: linkedinUrl.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      senioridade: senioridadeValor,
      area: area.trim() || null,
      tags: tagsFinal,
      linkCV: linkCV.trim() || null,
      cvArquivoUrl: cvArquivoUrl || null,
      cvNomeArquivo: cvNomeArquivo || null,
      notas: notas.trim() || null,
    };

    startTransition(async () => {
      const result = await atualizarTalento(talento.id, payload);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Alterações salvas");
        setTagInput("");
        router.refresh();
      }
    });
  }

  return (
    <section className="card p-6">
      <div className="mb-4">
        <div className="section-label mb-1">Detalhes</div>
        <h2 className="text-h3 text-ink">Informações do talento</h2>
        <p className="mt-1 text-sm text-slate-500">
          Edite os dados e salve as alterações.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="tif-nome" className="label">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            id="tif-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={isPending}
            required
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tif-email" className="label">
              Email
            </label>
            <input
              id="tif-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="tif-telefone" className="label">
              Telefone
            </label>
            <input
              id="tif-telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              disabled={isPending}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tif-linkedin" className="label">
            LinkedIn
          </label>
          <input
            id="tif-linkedin"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            disabled={isPending}
            className="input"
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-4">
          <div>
            <label htmlFor="tif-cidade" className="label">
              Cidade
            </label>
            <input
              id="tif-cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              disabled={isPending}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="tif-estado" className="label">
              UF
            </label>
            <input
              id="tif-estado"
              type="text"
              value={estado}
              onChange={(e) =>
                setEstado(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 2),
                )
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
            <label htmlFor="tif-senioridade" className="label">
              Senioridade
            </label>
            <Select
              id="tif-senioridade"
              value={senioridade}
              onChange={(v) => setSenioridade(v)}
              disabled={isPending}
              options={[
                { value: "", label: "Não informada" },
                ...SENIORIDADES,
              ]}
            />
          </div>
          <div>
            <label htmlFor="tif-area" className="label">
              Área
            </label>
            <input
              id="tif-area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={isPending}
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tif-tags" className="label">
            Tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-royal-100">
            {tags.map((tag) => (
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
              id="tif-tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInput.trim()) addTag(tagInput);
              }}
              disabled={isPending}
              placeholder={tags.length === 0 ? "Digite e pressione Enter" : ""}
              className="flex-1 min-w-[120px] border-0 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="label">Currículo</label>
          <div className="flex flex-col gap-2">
            {cvArquivoUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-slate-50 px-3 py-2">
                <a
                  href={cvArquivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-2 text-sm text-royal hover:underline"
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">
                    {cvNomeArquivo || "Currículo enviado"}
                  </span>
                </a>
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
                  id="tif-cv-file"
                />
                <label
                  htmlFor="tif-cv-file"
                  className={`btn-secondary cursor-pointer ${
                    uploading || isPending
                      ? "pointer-events-none opacity-60"
                      : ""
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="shrink-0 animate-spin" />
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
              <label htmlFor="tif-linkcv" className="label text-xs">
                Ou cole um link externo
              </label>
              <input
                id="tif-linkcv"
                type="url"
                value={linkCV}
                onChange={(e) => setLinkCV(e.target.value)}
                disabled={isPending}
                className="input"
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="tif-notas" className="label">
            Notas
          </label>
          <textarea
            id="tif-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={isPending}
            rows={4}
            className="input resize-y"
            placeholder="Impressões, áreas de interesse, histórico…"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isPending || uploading}
            className="btn-primary"
          >
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </section>
  );
}
