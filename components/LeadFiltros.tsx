"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

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

export function LeadFiltros({
  initialTab,
  initialQ,
  initialOrigem,
  incluirArquivados: initialIncluirArquivados,
  isAdmin,
  counts,
}: LeadFiltrosProps) {
  const router = useRouter();
  const [tab, setTab] = useState<LeadTab>(initialTab);
  const [q, setQ] = useState(initialQ);
  const [origem, setOrigem] = useState(initialOrigem);
  const [incluirArquivados, setIncluirArquivados] = useState(
    initialIncluirArquivados,
  );
  const [, startTransition] = useTransition();

  const mountedRef = useRef(false);
  const lastQuerySentRef = useRef<string | null>(null);

  function buildQueryString(next: {
    tab: LeadTab;
    q: string;
    origem: string;
    incluirArquivados: boolean;
  }): string {
    const params = new URLSearchParams();
    params.set("tab", next.tab);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.origem) params.set("origem", next.origem);
    if (next.incluirArquivados) params.set("incluirArquivados", "1");
    return params.toString();
  }

  function pushParams(next: {
    tab: LeadTab;
    q: string;
    origem: string;
    incluirArquivados: boolean;
  }) {
    const qs = buildQueryString(next);
    if (qs === lastQuerySentRef.current) return;
    lastQuerySentRef.current = qs;
    const href = `/comercial/leads?${qs}`;
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
        incluirArquivados,
      });
      return;
    }
    const handle = window.setTimeout(() => {
      pushParams({ tab, q, origem, incluirArquivados });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Imediato pros demais
  useEffect(() => {
    if (!mountedRef.current) return;
    pushParams({ tab, q, origem, incluirArquivados });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, origem, incluirArquivados]);

  function limpar() {
    setQ("");
    setOrigem("");
    setIncluirArquivados(false);
    setTab(initialTab);
    pushParams({
      tab: initialTab,
      q: "",
      origem: "",
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
    q.trim().length > 0 || origem.length > 0 || incluirArquivados;

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

        <select
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          className="input md:max-w-[12rem]"
          aria-label="Filtrar por origem"
        >
          {ORIGEM_OPCOES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

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
