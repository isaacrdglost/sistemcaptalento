"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

const SENIORIDADE_LABEL: Record<string, string> = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  lideranca: "Liderança",
};

interface TalentosFiltrosProps {
  initialQ: string;
  initialArea: string;
  initialSenioridade: string;
  initialTag: string;
  incluirArquivados: boolean;
  areas: string[];
  senioridades: string[];
}

export function TalentosFiltros({
  initialQ,
  initialArea,
  initialSenioridade,
  initialTag,
  incluirArquivados: initialIncluirArquivados,
  areas,
  senioridades,
}: TalentosFiltrosProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [area, setArea] = useState(initialArea);
  const [senioridade, setSenioridade] = useState(initialSenioridade);
  const [tag, setTag] = useState(initialTag);
  const [incluirArquivados, setIncluirArquivados] = useState(
    initialIncluirArquivados,
  );
  const [, startTransition] = useTransition();

  const mountedRef = useRef(false);
  const lastQuerySentRef = useRef<string | null>(null);

  function buildQueryString(next: {
    q: string;
    area: string;
    senioridade: string;
    tag: string;
    incluirArquivados: boolean;
  }): string {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.area.trim()) params.set("area", next.area.trim());
    if (next.senioridade) params.set("senioridade", next.senioridade);
    if (next.tag.trim()) params.set("tag", next.tag.trim());
    if (next.incluirArquivados) params.set("incluirArquivados", "1");
    return params.toString();
  }

  function pushParams(next: {
    q: string;
    area: string;
    senioridade: string;
    tag: string;
    incluirArquivados: boolean;
  }) {
    const qs = buildQueryString(next);
    if (qs === lastQuerySentRef.current) return;
    lastQuerySentRef.current = qs;
    const href = qs ? `/talentos?${qs}` : "/talentos";
    startTransition(() => {
      router.push(href);
    });
  }

  // Debounce apenas pro input de busca
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastQuerySentRef.current = buildQueryString({
        q,
        area,
        senioridade,
        tag,
        incluirArquivados,
      });
      return;
    }
    const handle = window.setTimeout(() => {
      pushParams({ q, area, senioridade, tag, incluirArquivados });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Navegação imediata para selects e toggle
  useEffect(() => {
    if (!mountedRef.current) return;
    pushParams({ q, area, senioridade, tag, incluirArquivados });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, senioridade, tag, incluirArquivados]);

  function limparFiltros() {
    setQ("");
    setArea("");
    setSenioridade("");
    setTag("");
    setIncluirArquivados(false);
    pushParams({
      q: "",
      area: "",
      senioridade: "",
      tag: "",
      incluirArquivados: false,
    });
  }

  const algumFiltroAtivo =
    q.trim().length > 0 ||
    area.trim().length > 0 ||
    senioridade.length > 0 ||
    tag.trim().length > 0 ||
    incluirArquivados;

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="relative flex-1 md:max-w-md">
          <label htmlFor="talentos-busca" className="label">
            Buscar
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="talentos-busca"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, e-mail, área ou tag"
              className="input pl-9"
              aria-label="Buscar talentos"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="w-full md:w-48">
          <label htmlFor="talentos-area" className="label">
            Área
          </label>
          <select
            id="talentos-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="input"
          >
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <label htmlFor="talentos-senioridade" className="label">
            Senioridade
          </label>
          <select
            id="talentos-senioridade"
            value={senioridade}
            onChange={(e) => setSenioridade(e.target.value)}
            className="input"
          >
            <option value="">Todas</option>
            {senioridades.map((s) => (
              <option key={s} value={s}>
                {SENIORIDADE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 md:pb-1">
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
        </div>
      </div>

      {tag ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Filtrando pela tag:</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            {tag}
          </span>
          <button
            type="button"
            onClick={() => setTag("")}
            className="text-slate-400 transition hover:text-ink"
            aria-label="Remover filtro de tag"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}

      {algumFiltroAtivo ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={limparFiltros}
            className="btn-ghost text-xs"
          >
            <X size={14} />
            <span>Limpar filtros</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
