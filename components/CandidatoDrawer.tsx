"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Linkedin,
  Mail,
  Paperclip,
  Phone,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import type {
  AnaliseFicha,
  Candidato,
  Modelo,
  ResultadoAnalise,
  StatusContratacao,
  StatusCandidato,
} from "@prisma/client";
import {
  editarCandidato,
  registrarAnaliseFicha,
} from "@/app/vagas/[id]/actions";
import { formatDateBR, formatRelative } from "@/lib/business-days";
import { formatCPF } from "@/lib/format";
import { useConfirm } from "./ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { ContratacaoModal } from "./ContratacaoModal";
import {
  diasRestantesGarantia,
  resumoStatusGarantia,
  toneGarantia,
} from "@/lib/garantia";
import { ShieldCheck } from "lucide-react";

export type AnaliseFichaComAutor = AnaliseFicha & {
  autor: { nome: string };
};

export interface ContratacaoResumo {
  id: string;
  status: StatusContratacao;
  dataAdmissao: Date;
  dataFimGarantia: Date;
}

export type CandidatoComAnalises = Candidato & {
  analises: AnaliseFichaComAutor[];
  contratacao?: ContratacaoResumo | null;
};

export interface VagaResumoParaDrawer {
  titulo: string;
  modelo: Modelo | null;
  salarioMin: number | null;
  salarioMax: number | null;
}

interface CandidatoDrawerProps {
  candidato: CandidatoComAnalises;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  /** Dados da vaga pra preencher o modal de contratação. Quando ausente,
   * o botão "Marcar como contratado" não aparece. */
  vagaResumo?: VagaResumoParaDrawer;
}

type Tab = "detalhes" | "ficha" | "notas";

const STATUS_META: Record<
  StatusCandidato,
  { label: string; badgeClass: string }
> = {
  triagem: { label: "Triagem", badgeClass: "badge-slate" },
  entrevista: { label: "Entrevista", badgeClass: "badge-royal" },
  shortlist: { label: "Shortlist", badgeClass: "badge-lima" },
  aprovado: { label: "Aprovado", badgeClass: "badge-green" },
  reprovado: { label: "Reprovado", badgeClass: "badge-red" },
};

const RESULTADO_META: Record<
  ResultadoAnalise,
  { label: string; badgeClass: string; descricao: string }
> = {
  limpa: {
    label: "Ficha limpa",
    badgeClass: "badge-green",
    descricao: "Nenhum registro relevante encontrado",
  },
  com_ocorrencias: {
    label: "Com ocorrências",
    badgeClass: "badge-red",
    descricao: "Processos ou registros que exigem atenção",
  },
  inconclusivo: {
    label: "Inconclusivo",
    badgeClass: "badge-amber",
    descricao: "Dados insuficientes ou ambíguos",
  },
  pendente: {
    label: "Pendente",
    badgeClass: "badge-slate",
    descricao: "Aguardando retorno da consulta",
  },
};

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Aplica máscara visual 000.000.000-00 conforme o usuário digita,
 * sem obrigar formato completo.
 */
function maskCpfInput(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Mascara CPF para exibição LGPD: revela só os últimos 3 dígitos.
 * Ex: "12345678901" → "•••.•••.•••-01"
 */
function maskCpfLgpd(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return formatCPF(cpf);
  return `•••.•••.•••-${d.slice(9, 11)}`;
}

const NOTAS_MAX = 5000;

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            disabled={disabled}
            onClick={() => onChange(value === n ? null : n)}
            className="rounded p-1 text-amber-400 transition hover:scale-110 disabled:opacity-50"
          >
            <Star
              size={20}
              className={active ? "fill-amber-400" : "fill-transparent text-slate-300"}
            />
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="ml-2 text-xs text-slate-400 hover:text-slate-600"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

function AnaliseItem({ analise }: { analise: AnaliseFichaComAutor }) {
  const [expanded, setExpanded] = useState(false);
  const meta = RESULTADO_META[analise.resultado];
  const notasLongas = (analise.notas ?? "").length > 80;
  const notasPreview =
    !expanded && notasLongas
      ? `${(analise.notas ?? "").slice(0, 80)}…`
      : analise.notas ?? "";

  return (
    <li className="rounded-xl border border-slate-200/70 bg-white p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={meta.badgeClass}>{meta.label}</span>
        <span className="text-xs text-slate-500">
          {analise.provedor}
        </span>
        <span className="text-xs text-slate-300">•</span>
        <span
          className="text-xs text-slate-500"
          title={formatDateBR(analise.createdAt)}
        >
          {formatRelative(analise.createdAt)}
        </span>
        <span className="text-xs text-slate-300">•</span>
        <span className="text-xs text-slate-500">{analise.autor.nome}</span>
      </div>
      {analise.notas && (
        <div className="mt-2 text-sm text-slate-700">
          <p className="whitespace-pre-wrap break-words">{notasPreview}</p>
          {notasLongas && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-royal hover:underline"
            >
              {expanded ? "Recolher" : "Expandir"}
            </button>
          )}
        </div>
      )}
      {analise.linkExterno && (
        <a
          href={analise.linkExterno}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
        >
          <ExternalLink size={12} />
          Abrir link externo
        </a>
      )}
    </li>
  );
}

export function CandidatoDrawer({
  candidato,
  canEdit,
  open,
  onClose,
  vagaResumo,
}: CandidatoDrawerProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<Tab>("detalhes");
  const [contratacaoModalOpen, setContratacaoModalOpen] = useState(false);

  const [nome, setNome] = useState(candidato.nome);
  const [email, setEmail] = useState(candidato.email ?? "");
  const [telefone, setTelefone] = useState(candidato.telefone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(candidato.linkedinUrl ?? "");
  const [cpf, setCpf] = useState(
    candidato.cpf ? maskCpfInput(candidato.cpf) : "",
  );
  const [mostrarCpf, setMostrarCpf] = useState(false);
  const [linkCV, setLinkCV] = useState(candidato.linkCV ?? "");
  const [cvArquivoUrl, setCvArquivoUrl] = useState(
    candidato.cvArquivoUrl ?? "",
  );
  const [cvNomeArquivo, setCvNomeArquivo] = useState(
    candidato.cvNomeArquivo ?? "",
  );
  const [uploadingCv, setUploadingCv] = useState(false);
  const [score, setScore] = useState<number | null>(candidato.score ?? null);
  const [notas, setNotas] = useState(candidato.notas ?? "");

  const [isPendingDetails, startDetailsTransition] = useTransition();
  const [isPendingNotas, startNotasTransition] = useTransition();

  // Form da análise de ficha
  const [fichaCpf, setFichaCpf] = useState(
    candidato.cpf ? maskCpfInput(candidato.cpf) : "",
  );
  const [fichaResultado, setFichaResultado] =
    useState<ResultadoAnalise>("limpa");
  const [fichaProvedor, setFichaProvedor] = useState("escavador");
  const [fichaLinkExterno, setFichaLinkExterno] = useState("");
  const [fichaNotas, setFichaNotas] = useState("");
  const [isPendingFicha, startFichaTransition] = useTransition();

  // Sincroniza o estado com a prop sempre que trocar de candidato ou reabrir
  useEffect(() => {
    setNome(candidato.nome);
    setEmail(candidato.email ?? "");
    setTelefone(candidato.telefone ?? "");
    setLinkedinUrl(candidato.linkedinUrl ?? "");
    setCpf(candidato.cpf ? maskCpfInput(candidato.cpf) : "");
    setMostrarCpf(false);
    setLinkCV(candidato.linkCV ?? "");
    setCvArquivoUrl(candidato.cvArquivoUrl ?? "");
    setCvNomeArquivo(candidato.cvNomeArquivo ?? "");
    setScore(candidato.score ?? null);
    setNotas(candidato.notas ?? "");
    setFichaCpf(candidato.cpf ? maskCpfInput(candidato.cpf) : "");
    setFichaResultado("limpa");
    setFichaProvedor("escavador");
    setFichaLinkExterno("");
    setFichaNotas("");
    setTab("detalhes");
  }, [
    candidato.id,
    candidato.nome,
    candidato.email,
    candidato.telefone,
    candidato.linkedinUrl,
    candidato.cpf,
    candidato.linkCV,
    candidato.cvArquivoUrl,
    candidato.cvNomeArquivo,
    candidato.score,
    candidato.notas,
    open,
  ]);

  // Escape fecha
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll enquanto o drawer está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const statusMeta = STATUS_META[candidato.status];

  const notasRestantes = useMemo(
    () => NOTAS_MAX - notas.length,
    [notas.length],
  );

  const readOnly = !canEdit;

  const cpfDigits = onlyDigits(cpf);
  const cpfExibido = mostrarCpf
    ? formatCPF(cpfDigits) || cpf
    : cpfDigits.length === 11
      ? maskCpfLgpd(cpfDigits)
      : cpf;

  const fichaCpfDigits = onlyDigits(fichaCpf);
  const fichaNotasObrigatoria =
    fichaResultado === "com_ocorrencias" || fichaResultado === "pendente";

  const handleSalvarDetalhes = () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast.error("Informe o nome do candidato");
      return;
    }
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }
    startDetailsTransition(async () => {
      const result = await editarCandidato(candidato.id, {
        nome: nomeTrim,
        email: email.trim() ? email.trim() : null,
        telefone: telefone.trim() ? telefone.trim() : null,
        linkedinUrl: linkedinUrl.trim() ? linkedinUrl.trim() : null,
        linkCV: linkCV.trim() ? linkCV.trim() : null,
        cvArquivoUrl: cvArquivoUrl.trim() ? cvArquivoUrl.trim() : null,
        cvNomeArquivo: cvNomeArquivo.trim() ? cvNomeArquivo.trim() : null,
        cpf: cpfDigits ? cpfDigits : null,
        notas: notas.trim() ? notas : null,
        score: score,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Detalhes atualizados");
        router.refresh();
      }
    });
  };

  const handleSalvarNotas = () => {
    startNotasTransition(async () => {
      const result = await editarCandidato(candidato.id, {
        nome: candidato.nome,
        email: candidato.email ?? null,
        telefone: candidato.telefone ?? null,
        linkedinUrl: candidato.linkedinUrl ?? null,
        linkCV: candidato.linkCV ?? null,
        cvArquivoUrl: candidato.cvArquivoUrl ?? null,
        cvNomeArquivo: candidato.cvNomeArquivo ?? null,
        cpf: candidato.cpf ?? null,
        notas: notas.trim() ? notas : null,
        score: candidato.score ?? null,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Notas salvas");
        router.refresh();
      }
    });
  };

  const handleUploadCv = async (file: File) => {
    if (readOnly) return;
    const form = new FormData();
    form.append("file", file);
    setUploadingCv(true);
    try {
      const res = await fetch("/api/upload-cv", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as
        | {
            ok: true;
            url: string;
            nomeArquivo: string;
            tamanho: number;
            tipo: string;
          }
        | { error: string };
      if (!("ok" in json) || !json.ok) {
        const msg = "error" in json ? json.error : "Erro ao enviar arquivo";
        toast.error(msg);
        return;
      }
      setCvArquivoUrl(json.url);
      setCvNomeArquivo(json.nomeArquivo);
      toast.success("Arquivo enviado");
    } catch {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoverCv = async () => {
    if (readOnly) return;
    const ok = await confirm({
      title: "Remover CV",
      message: "Tem certeza que deseja remover o arquivo de CV deste candidato?",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    setCvArquivoUrl("");
    setCvNomeArquivo("");
    toast.success("CV removido. Clique em Salvar para persistir.");
  };

  const handleAbrirEscavador = () => {
    const d = fichaCpfDigits;
    if (d.length !== 11) {
      toast.error("Informe um CPF válido antes de consultar");
      return;
    }
    window.open(
      `https://www.escavador.com/sobre/?q=${d}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleAbrirJusBrasil = () => {
    const d = fichaCpfDigits;
    if (d.length !== 11) {
      toast.error("Informe um CPF válido antes de consultar");
      return;
    }
    window.open(
      `https://www.jusbrasil.com.br/busca?q=${formatCPF(d)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleRegistrarAnalise = () => {
    if (fichaCpfDigits.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }
    if (fichaNotasObrigatoria && !fichaNotas.trim()) {
      toast.error(
        "Notas são obrigatórias para resultados com ocorrências ou pendentes",
      );
      return;
    }
    startFichaTransition(async () => {
      const result = await registrarAnaliseFicha(candidato.id, {
        cpf: fichaCpfDigits,
        resultado: fichaResultado,
        provedor: fichaProvedor.trim() || "escavador",
        notas: fichaNotas.trim() ? fichaNotas.trim() : null,
        linkExterno: fichaLinkExterno.trim() ? fichaLinkExterno.trim() : null,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Análise registrada");
        setFichaResultado("limpa");
        setFichaProvedor("escavador");
        setFichaLinkExterno("");
        setFichaNotas("");
        router.refresh();
      }
    });
  };

  const temCpfSalvo = Boolean(candidato.cpf);
  const tabsDisponiveis: Tab[] = canEdit
    ? ["detalhes", "ficha", "notas"]
    : ["detalhes", "notas"];
  const tabLabel: Record<Tab, string> = {
    detalhes: "Detalhes",
    ficha: "Ficha",
    notas: "Notas",
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-label={`Candidato ${candidato.nome}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white p-6 shadow-raised"
          >
            <header className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-royal text-base font-bold text-white">
                {iniciais(candidato.nome)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-ink">
                  {candidato.nome}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={statusMeta.badgeClass}>
                    {statusMeta.label}
                  </span>
                  {candidato.score !== null && candidato.score !== undefined && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <Star size={12} className="fill-amber-400" />
                      {candidato.score}/5
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="btn-icon"
              >
                <X size={18} />
              </button>
            </header>

            <ContratacaoSummaryCard
              candidato={candidato}
              canEdit={canEdit}
              vagaResumo={vagaResumo}
              onAbrirModal={() => setContratacaoModalOpen(true)}
            />

            <div className="mt-6 flex gap-1 rounded-lg bg-slate-100 p-1">
              {tabsDisponiveis.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === t ? "text-ink" : "text-slate-500 hover:text-ink"
                  }`}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="candidatodrawer-tab-indicator"
                      className="absolute inset-0 rounded-md bg-white shadow-xs"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{tabLabel[t]}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <AnimatePresence mode="wait">
                {tab === "detalhes" && (
                  <motion.div
                    key="detalhes"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="label" htmlFor="drawer-nome">
                        Nome
                      </label>
                      <input
                        id="drawer-nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        disabled={readOnly || isPendingDetails}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="drawer-email">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={12} /> E-mail
                        </span>
                      </label>
                      <input
                        id="drawer-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={readOnly || isPendingDetails}
                        placeholder="candidato@exemplo.com"
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="drawer-telefone">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={12} /> Telefone
                        </span>
                      </label>
                      <input
                        id="drawer-telefone"
                        type="tel"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        disabled={readOnly || isPendingDetails}
                        placeholder="(11) 99999-9999"
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="drawer-linkedin">
                        <span className="inline-flex items-center gap-1.5">
                          <Linkedin size={12} /> LinkedIn
                        </span>
                      </label>
                      <input
                        id="drawer-linkedin"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        disabled={readOnly || isPendingDetails}
                        placeholder="https://linkedin.com/in/..."
                        className="input"
                      />
                      {linkedinUrl.trim() && (
                        <a
                          href={linkedinUrl.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
                        >
                          <ExternalLink size={12} />
                          Abrir perfil
                        </a>
                      )}
                    </div>

                    <div>
                      <label className="label" htmlFor="drawer-cpf">
                        CPF
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="drawer-cpf"
                          type="text"
                          inputMode="numeric"
                          value={mostrarCpf ? formatCPF(cpfDigits) || cpf : cpfExibido}
                          onChange={(e) => {
                            setMostrarCpf(true);
                            setCpf(maskCpfInput(e.target.value));
                          }}
                          disabled={readOnly || isPendingDetails}
                          placeholder="000.000.000-00"
                          className="input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarCpf((v) => !v)}
                          disabled={cpfDigits.length === 0}
                          aria-label={mostrarCpf ? "Ocultar CPF" : "Mostrar CPF"}
                          title={mostrarCpf ? "Ocultar" : "Mostrar"}
                          className="btn-icon"
                        >
                          {mostrarCpf ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Dado sensível (LGPD). Exibido mascarado por padrão.
                      </p>
                    </div>

                    <div>
                      <label className="label" htmlFor="drawer-cv">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText size={12} /> Link do CV (externo)
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="drawer-cv"
                          type="url"
                          value={linkCV}
                          onChange={(e) => setLinkCV(e.target.value)}
                          disabled={readOnly || isPendingDetails}
                          placeholder="https://drive.google.com/..."
                          className="input flex-1"
                        />
                        {linkCV.trim() && (
                          <a
                            href={linkCV.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-icon"
                            aria-label="Abrir CV externo"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                      {linkCV.trim() && !cvArquivoUrl && (
                        <a
                          href={linkCV.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
                        >
                          <ExternalLink size={12} />
                          Abrir CV externo
                        </a>
                      )}
                    </div>

                    <div>
                      <label className="label">
                        <span className="inline-flex items-center gap-1.5">
                          <Paperclip size={12} /> Arquivo de CV
                        </span>
                      </label>
                      {cvArquivoUrl ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink">
                            <FileText size={14} className="shrink-0 text-slate-500" />
                            <span className="truncate" title={cvNomeArquivo}>
                              {cvNomeArquivo || "Arquivo"}
                            </span>
                          </span>
                          <a
                            href={cvArquivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary ml-auto py-1 px-2 text-xs"
                          >
                            <ExternalLink size={12} />
                            Abrir
                          </a>
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingCv}
                                className="btn-secondary py-1 px-2 text-xs"
                              >
                                <Upload size={12} />
                                Substituir
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoverCv}
                                aria-label="Remover arquivo"
                                title="Remover"
                                className="rounded px-1.5 py-1 text-slate-400 transition hover:text-red-600"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      ) : !readOnly ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingCv || isPendingDetails}
                            className="btn-secondary py-1.5 px-3 text-sm"
                          >
                            <Upload size={14} />
                            {uploadingCv ? "Enviando…" : "Enviar arquivo"}
                          </button>
                          <span className="text-[11px] text-slate-400">
                            PDF, DOC/DOCX, JPG ou PNG até 8 MB
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Nenhum arquivo anexado.
                        </p>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadCv(f);
                        }}
                      />
                    </div>

                    <div>
                      <label className="label">Score</label>
                      <StarPicker
                        value={score}
                        onChange={setScore}
                        disabled={readOnly || isPendingDetails}
                      />
                    </div>

                    {!readOnly && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSalvarDetalhes}
                          disabled={isPendingDetails || uploadingCv}
                          className="btn-primary w-full"
                        >
                          {isPendingDetails ? "Salvando…" : "Salvar"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === "ficha" && canEdit && (
                  <motion.div
                    key="ficha"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Análise de antecedentes
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Consulte se o candidato tem processos trabalhistas,
                        criminais ou outros antecedentes relevantes. A consulta
                        é feita externamente (Escavador/JusBrasil) — o resultado
                        é registrado aqui com histórico auditado.
                      </p>
                    </div>

                    {!temCpfSalvo ? (
                      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-center">
                        <p className="text-sm font-semibold text-amber-800">
                          CPF obrigatório
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          CPF é obrigatório pra análise de ficha. Preencha na
                          aba Detalhes antes de prosseguir.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab("detalhes")}
                          className="btn-secondary mt-3 py-1.5 px-3 text-xs"
                        >
                          Ir pra Detalhes
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Nova análise
                          </h4>

                          <div className="mt-3 flex flex-col gap-3">
                            <div>
                              <label className="label" htmlFor="ficha-cpf">
                                CPF
                              </label>
                              <input
                                id="ficha-cpf"
                                type="text"
                                inputMode="numeric"
                                value={fichaCpf}
                                onChange={(e) =>
                                  setFichaCpf(maskCpfInput(e.target.value))
                                }
                                disabled={isPendingFicha}
                                placeholder="000.000.000-00"
                                className="input"
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={handleAbrirEscavador}
                                disabled={fichaCpfDigits.length !== 11}
                                className="btn-secondary justify-start py-2 text-sm"
                              >
                                <Search size={14} />
                                Abrir no Escavador
                                <ExternalLink size={12} className="ml-auto" />
                              </button>
                              <button
                                type="button"
                                onClick={handleAbrirJusBrasil}
                                disabled={fichaCpfDigits.length !== 11}
                                className="btn-secondary justify-start py-2 text-sm"
                              >
                                <Search size={14} />
                                Abrir no JusBrasil
                                <ExternalLink size={12} className="ml-auto" />
                              </button>
                            </div>

                            <div>
                              <label className="label" htmlFor="ficha-resultado">
                                Resultado
                              </label>
                              <Select
                                id="ficha-resultado"
                                value={fichaResultado}
                                onChange={(v) =>
                                  setFichaResultado(v as ResultadoAnalise)
                                }
                                disabled={isPendingFicha}
                                options={(
                                  [
                                    "limpa",
                                    "com_ocorrencias",
                                    "inconclusivo",
                                    "pendente",
                                  ] as ResultadoAnalise[]
                                ).map((r) => ({
                                  value: r,
                                  label: RESULTADO_META[r].label,
                                  description: RESULTADO_META[r].descricao,
                                }))}
                              />
                            </div>

                            <div>
                              <label className="label">Provedor</label>
                              <div className="flex flex-wrap gap-2">
                                {["escavador", "jusbrasil", "outro"].map(
                                  (p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setFichaProvedor(p)}
                                      disabled={isPendingFicha}
                                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                        fichaProvedor === p
                                          ? "border-royal bg-royal text-white"
                                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                      }`}
                                    >
                                      {p === "escavador"
                                        ? "Escavador"
                                        : p === "jusbrasil"
                                          ? "JusBrasil"
                                          : "Outro"}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>

                            <div>
                              <label
                                className="label"
                                htmlFor="ficha-link-externo"
                              >
                                Link externo (opcional)
                              </label>
                              <input
                                id="ficha-link-externo"
                                type="url"
                                value={fichaLinkExterno}
                                onChange={(e) =>
                                  setFichaLinkExterno(e.target.value)
                                }
                                disabled={isPendingFicha}
                                placeholder="https://..."
                                className="input"
                              />
                            </div>

                            <div>
                              <label className="label" htmlFor="ficha-notas">
                                Notas{" "}
                                {fichaNotasObrigatoria && (
                                  <span className="text-red-600">
                                    (obrigatório)
                                  </span>
                                )}
                              </label>
                              <textarea
                                id="ficha-notas"
                                value={fichaNotas}
                                onChange={(e) => setFichaNotas(e.target.value)}
                                disabled={isPendingFicha}
                                rows={4}
                                placeholder={
                                  fichaNotasObrigatoria
                                    ? "Descreva as ocorrências ou o motivo da pendência…"
                                    : "Observações sobre a consulta…"
                                }
                                className="input resize-y"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleRegistrarAnalise}
                              disabled={isPendingFicha}
                              className="btn-primary w-full"
                            >
                              {isPendingFicha
                                ? "Registrando…"
                                : "Registrar análise"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Histórico de análises
                          </h4>
                          {candidato.analises.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-400">
                              Nenhuma análise registrada ainda.
                            </p>
                          ) : (
                            <ul className="mt-2 flex flex-col gap-2">
                              {candidato.analises.map((a) => (
                                <AnaliseItem key={a.id} analise={a} />
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {tab === "notas" && (
                  <motion.div
                    key="notas"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3"
                  >
                    <label className="label" htmlFor="drawer-notas">
                      Observações sobre o candidato
                    </label>
                    <textarea
                      id="drawer-notas"
                      value={notas}
                      onChange={(e) =>
                        setNotas(e.target.value.slice(0, NOTAS_MAX))
                      }
                      disabled={readOnly || isPendingNotas}
                      rows={12}
                      placeholder="Impressões, pontos fortes, próximos passos…"
                      className="input resize-y"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {notas.length} / {NOTAS_MAX}
                      </span>
                      <span
                        className={
                          notasRestantes < 200
                            ? "text-amber-600"
                            : "text-slate-400"
                        }
                      >
                        {notasRestantes} restantes
                      </span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleSalvarNotas}
                        disabled={isPendingNotas}
                        className="btn-primary w-full"
                      >
                        {isPendingNotas ? "Salvando…" : "Salvar notas"}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div>
                <div className="font-semibold uppercase tracking-wide text-slate-400">
                  Adicionado em
                </div>
                <div className="mt-0.5 text-ink">
                  {formatDateBR(candidato.createdAt)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide text-slate-400">
                  Status desde
                </div>
                <div className="mt-0.5 text-ink">
                  {formatDateBR(candidato.etapaDesde)}
                </div>
              </div>
            </footer>
          </motion.aside>
        </div>
      )}
      {vagaResumo ? (
        <ContratacaoModal
          open={contratacaoModalOpen}
          onClose={() => setContratacaoModalOpen(false)}
          candidato={{ id: candidato.id, nome: candidato.nome }}
          vaga={vagaResumo}
        />
      ) : null}
    </AnimatePresence>
  );
}

interface ContratacaoSummaryCardProps {
  candidato: CandidatoComAnalises;
  canEdit: boolean;
  vagaResumo: VagaResumoParaDrawer | undefined;
  onAbrirModal: () => void;
}

function ContratacaoSummaryCard({
  candidato,
  canEdit,
  vagaResumo,
  onAbrirModal,
}: ContratacaoSummaryCardProps) {
  const c = candidato.contratacao;

  if (c) {
    const tone = toneGarantia(c.status, c.dataFimGarantia);
    const dias = diasRestantesGarantia(c.dataFimGarantia);
    const toneClasses: Record<typeof tone, string> = {
      lima: "border-lima-200 bg-lima-50 text-lima-700",
      amber: "border-amber-200 bg-amber-50 text-amber-700",
      red: "border-red-200 bg-red-50 text-red-700",
      slate: "border-line bg-slate-50 text-slate-600",
    };
    return (
      <div
        className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${toneClasses[tone]}`}
      >
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Contratação
          </div>
          <div className="text-sm font-semibold">
            {resumoStatusGarantia(c)}
          </div>
          <div className="mt-0.5 text-xs opacity-80">
            Admissão {formatDateBR(c.dataAdmissao)} · Garantia até{" "}
            {formatDateBR(c.dataFimGarantia)}
            {c.status === "em_garantia" && dias > 0
              ? ` (${dias}d)`
              : ""}
          </div>
        </div>
      </div>
    );
  }

  const podeMarcar =
    canEdit &&
    vagaResumo !== undefined &&
    (candidato.status === "aprovado" || candidato.status === "shortlist");

  if (!podeMarcar) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-lima-200 bg-lima-50/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-lima-700">
          Pronto pra contratar?
        </div>
        <div className="text-xs text-slate-600">
          Registre a admissão e a garantia de 30d começa a contar.
        </div>
      </div>
      <button
        type="button"
        onClick={onAbrirModal}
        className="btn-primary shrink-0 text-xs"
      >
        <ShieldCheck size={14} />
        Marcar como contratado
      </button>
    </div>
  );
}
