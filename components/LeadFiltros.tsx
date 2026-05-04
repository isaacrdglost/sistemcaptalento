"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Search, Tag as TagIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export type LeadTab =
  | "meus"
  | "sem_responsavel"
  | "todos"
  | "ganhos"
  | "perdidos";

const ORIGEM_OPCOES: { value: string; label: string }[] = [
  { value: "", label: "Todas as origens" },
  { value: "prospeccao_ativa", label: "Prospecção ativa" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "redes_sociais", label: "Redes sociais" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "evento", label: "Evento" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

interface LeadFiltrosProps {
  initialTab: LeadTab;
  initialQ: string;
  initialOrigem: string;
  initialTag?: string;
  initialStuck?: boolean;
  incluirArquivados: boolean;
  isAdmin: boolean;
  counts?: {
    meus: number;
    semResponsavel: number;
    todos: number;
    ganhos?: number;
    perdidos?: number;
  };
}

interface QueryShape {
  tab: LeadTab;
  q: string;
  origem: string;
  tag: string;
  stuck: boolean;
  incluirArquivados: boolean;
}

export function LeadFiltros({
  initialTab,
  initialQ,
  initialOrigem,
  initialTag = "",
  initialStuck = false,
  incluirArquivados: initialIncluirArquivados,
  isAdmin,
  counts,
}: LeadFiltrosProps) {
  const router = useRouter();
  const [tab, setTab] = useState<LeadTab>(initialTab);
  const [q, setQ] = useState(initialQ);
  const [origem, setOrigem] = useState(initialOrigem);
  const [tag, setTag] = useState(initialTag);
  const [stuck, setStuck] = useState(initialStuck);
  const [incluirArquivados, setIncluirArquivados] = useState(
    initialIncluirArquivados,
  );
  const [, startTransition] = useTransition();

  // Sub-estado do popover de tag (autocomplete idêntico ao LeadTagInput)
  const [tagDraft, setTagDraft] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [todasTags, setTodasTags] = useState<string[]>([]);
  const [tagsCarregadas, setTagsCarregadas] = useState(false);
  const tagWrapperRef = useRef<HTMLDivElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const tagDebounceRef = useRef<number | null>(null);

  const mountedRef = useRef(false);
  const lastQuerySentRef = useRef<string | null>(null);

  function buildQueryString(next: QueryShape): string {
    const params = new URLSearchParams();
    params.set("tab", next.tab);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.origem) params.set("origem", next.origem);
    if (next.tag) params.set("tag", next.tag);
    if (next.stuck) params.set("stuck", "1");
    if (next.incluirArquivados) params.set("incluirArquivados", "1");
    return params.toString();
  }

  function pushParams(next: QueryShape) {
    const qs = buildQueryString(next);
    if (qs === lastQuerySentRef.current) return;
    lastQuerySentRef.current = qs;
    const href = qs ? `/comercial?${qs}` : "/comercial";
    startTransition(() => {
      router.push(href);
    });
  }

  // Debounce só pro q
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastQuerySentRef.current = buildQueryString({
        tab,
        q,
        origem,
        tag,
        stuck,
        incluirArquivados,
      });
      return;
    }
    const handle = window.setTimeout(() => {
      pushParams({ tab, q, origem, tag, stuck, incluirArquivados });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Imediato pros demais
  useEffect(() => {
    if (!mountedRef.current) return;
    pushParams({ tab, q, origem, tag, stuck, incluirArquivados });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, origem, tag, stuck, incluirArquivados]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/leads/tags", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tags?: string[] };
      if (Array.isArray(data.tags)) {
        setTodasTags(data.tags);
      }
    } catch {
      // silencioso
    } finally {
      setTagsCarregadas(true);
    }
  }, []);

  // Click fora fecha o popover de tag
  useEffect(() => {
    if (!tagOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (
        tagWrapperRef.current &&
        !tagWrapperRef.current.contains(e.target as Node)
      ) {
        setTagOpen(false);
        setTagHighlight(-1);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [tagOpen]);

  // Debounce do fetch quando o draft muda
  useEffect(() => {
    if (tagDebounceRef.current) {
      window.clearTimeout(tagDebounceRef.current);
    }
    tagDebounceRef.current = window.setTimeout(() => {
      void fetchTags();
    }, 300);
    return () => {
      if (tagDebounceRef.current) {
        window.clearTimeout(tagDebounceRef.current);
      }
    };
  }, [tagDraft, fetchTags]);

  const tagSugestoes = useMemo(() => {
    const draftNorm = tagDraft.trim().toLowerCase();
    const filtradas = todasTags.filter((t) => {
      if (!draftNorm) return true;
      return t.toLowerCase().startsWith(draftNorm);
    });
    return filtradas.slice(0, 8);
  }, [tagDraft, todasTags]);

  useEffect(() => {
    if (tagHighlight >= tagSugestoes.length) {
      setTagHighlight(tagSugestoes.length > 0 ? 0 : -1);
    }
  }, [tagSugestoes.length, tagHighlight]);

  function aplicarTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    setTag(t);
    setTagDraft("");
    setTagOpen(false);
    setTagHighlight(-1);
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagOpen && tagHighlight >= 0 && tagSugestoes[tagHighlight]) {
        aplicarTag(tagSugestoes[tagHighlight]);
      } else if (tagDraft.trim()) {
        aplicarTag(tagDraft);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      if (tagSugestoes.length === 0) return;
      e.preventDefault();
      setTagOpen(true);
      setTagHighlight((prev) => {
        const next = prev + 1;
        return next >= tagSugestoes.length ? 0 : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      if (tagSugestoes.length === 0) return;
      e.preventDefault();
      setTagOpen(true);
      setTagHighlight((prev) => {
        const next = prev - 1;
        return next < 0 ? tagSugestoes.length - 1 : next;
      });
      return;
    }
    if (e.key === "Escape") {
      if (tagOpen) {
        e.preventDefault();
        setTagOpen(false);
        setTagHighlight(-1);
      }
    }
  }

  function limparTag() {
    setTag("");
  }

  function limparStuck() {
    setStuck(false);
  }

  function limpar() {
    setQ("");
    setOrigem("");
    setIncluirArquivados(false);
    setTab(initialTab);
    setTag("");
    setStuck(false);
    pushParams({
      tab: initialTab,
      q: "",
      origem: "",
      tag: "",
      stuck: false,
      incluirArquivados: false,
    });
  }

  const tabsDisponiveis: { value: LeadTab; label: string; count?: number }[] = [
    { value: "meus", label: "Meus", count: counts?.meus },
    {
      value: "sem_responsavel",
      label: "Sem responsável",
      count: counts?.semResponsavel,
    },
  ];
  if (isAdmin) {
    tabsDisponiveis.push({
      value: "todos",
      label: "Todos",
      count: counts?.todos,
    });
  }
  tabsDisponiveis.push({
    value: "ganhos",
    label: "Ganhos",
    count: counts?.ganhos,
  });
  tabsDisponiveis.push({
    value: "perdidos",
    label: "Perdidos",
    count: counts?.perdidos,
  });

  const algumFiltro =
    q.trim().length > 0 ||
    origem.length > 0 ||
    incluirArquivados ||
    tag.length > 0 ||
    stuck;

  const tagPopoverAberto = tagOpen && tagSugestoes.length > 0;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex flex-wrap gap-1">
        {tabsDisponiveis.map((t) => {
          const ativo = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                ativo
                  ? "bg-royal text-white shadow-xs"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-line hover:bg-slate-50"
              }`}
            >
              <span>{t.label}</span>
              {typeof t.count === "number" ? (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    ativo
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {(tag || stuck) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tag ? (
            <button
              type="button"
              onClick={limparTag}
              className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1 text-xs font-semibold text-royal-700 ring-1 ring-inset ring-royal-100 transition hover:bg-royal-100"
              aria-label={`Remover filtro de tag ${tag}`}
            >
              <TagIcon size={11} />
              <span>
                Tag: <span className="font-bold">{tag}</span>
              </span>
              <X size={11} />
            </button>
          ) : null}
          {stuck ? (
            <button
              type="button"
              onClick={limparStuck}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100 transition hover:bg-amber-100"
              aria-label="Remover filtro de leads parados"
            >
              <AlarmClock size={11} />
              <span>Parados &gt;7d</span>
              <X size={11} />
            </button>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        <div className="relative flex-1 md:max-w-md">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por empresa, contato ou e-mail"
            className="input input-with-icon"
            aria-label="Buscar leads"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <Select
          value={origem}
          onChange={(v) => setOrigem(v)}
          className="md:max-w-[12rem]"
          ariaLabel="Filtrar por origem"
          options={ORIGEM_OPCOES}
        />

        <div ref={tagWrapperRef} className="relative md:max-w-[12rem] md:flex-1">
          <TagIcon size={14} className="input-icon" />
          <input
            ref={tagInputRef}
            type="text"
            value={tagDraft}
            onChange={(e) => {
              setTagDraft(e.target.value);
              setTagOpen(true);
            }}
            onFocus={() => {
              setTagOpen(true);
              if (!tagsCarregadas) void fetchTags();
            }}
            onKeyDown={handleTagKey}
            placeholder="Filtrar por tag"
            aria-label="Filtrar por tag"
            aria-autocomplete="list"
            aria-expanded={tagPopoverAberto}
            className="input input-with-icon"
          />
          <AnimatePresence>
            {tagPopoverAberto && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 right-0 z-50 mt-1.5 origin-top overflow-hidden rounded-xl border border-line/70 bg-white shadow-lg"
              >
                <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
                  {tagSugestoes.map((t, idx) => {
                    const ativo = idx === tagHighlight;
                    return (
                      <li
                        key={t}
                        role="option"
                        aria-selected={ativo}
                        onMouseEnter={() => setTagHighlight(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          aplicarTag(t);
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg px-3 py-1.5 text-sm transition",
                          ativo ? "bg-royal-50 text-royal-700" : "text-ink",
                        )}
                      >
                        {t}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={incluirArquivados}
            onChange={(e) => setIncluirArquivados(e.target.checked)}
          />
          <span
            className={`relative h-6 w-11 rounded-full transition ${
              incluirArquivados ? "bg-royal" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                incluirArquivados ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
          <span className="text-sm text-slate-600">Incluir arquivados</span>
        </label>

        {algumFiltro ? (
          <button
            type="button"
            onClick={limpar}
            className="btn-ghost text-xs md:ml-auto"
          >
            <X size={14} />
            <span>Limpar filtros</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
