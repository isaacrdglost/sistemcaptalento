"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { StatusCandidato } from "@prisma/client";
import { importarCandidatosDaAgenda } from "@/app/vagas/[id]/actions";
import { formatDateBR } from "@/lib/business-days";

interface ImportarAgendaDrawerProps {
  vagaId: string;
  open: boolean;
  onClose: () => void;
}

interface CalendarEventoImportavel {
  uid: string;
  titulo: string;
  nomeSugerido: string;
  descricao: string;
  local: string | null;
  inicio: string | null;
  fim: string | null;
  allDay: boolean;
  status: string | null;
}

interface CalendarEventosResponse {
  ok: true;
  eventos: CalendarEventoImportavel[];
  uidsImportados: string[];
}

type StatusImportavel = Extract<
  StatusCandidato,
  "triagem" | "entrevista" | "shortlist" | "aprovado" | "reprovado"
>;

const STATUS_OPTIONS: { value: StatusImportavel; label: string }[] = [
  { value: "triagem", label: "Triagem" },
  { value: "entrevista", label: "Entrevista" },
  { value: "shortlist", label: "Shortlist" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
];

type FiltroRapido = "todos" | "proximos30" | "ultimos60" | "estaSemana" | "naoImportados";

const FILTROS: { value: FiltroRapido; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "proximos30", label: "Próximos 30d" },
  { value: "ultimos60", label: "Últimos 60d" },
  { value: "estaSemana", label: "Esta semana" },
  { value: "naoImportados", label: "Não importados" },
];

interface EventoForm {
  nome: string;
  email: string;
  telefone: string;
  status: StatusImportavel;
  selecionado: boolean;
}

function extrairContato(descricao: string): { email: string; telefone: string } {
  const emailMatch = descricao.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const telMatch = descricao.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/);
  return {
    email: emailMatch ? emailMatch[0] : "",
    telefone: telMatch ? telMatch[0] : "",
  };
}

function formatHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isSameWeek(date: Date, ref: Date): boolean {
  // Semana começando domingo (pt-BR comum). Considera intervalo [início, fim].
  const d = new Date(date);
  const r = new Date(ref);
  const start = new Date(r);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
}

export function ImportarAgendaDrawer({
  vagaId,
  open,
  onClose,
}: ImportarAgendaDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [naoConfigurado, setNaoConfigurado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eventos, setEventos] = useState<CalendarEventoImportavel[]>([]);
  const [uidsImportados, setUidsImportados] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Record<string, EventoForm>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroRapido>("todos");
  const [isImporting, startImportTransition] = useTransition();

  const resetState = useCallback(() => {
    setLoading(false);
    setNaoConfigurado(false);
    setErrorMsg(null);
    setEventos([]);
    setUidsImportados(new Set());
    setForms({});
    setBusca("");
    setFiltro("todos");
  }, []);

  // Escape fecha
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Carrega eventos ao abrir
  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setNaoConfigurado(false);

    (async () => {
      try {
        const res = await fetch(
          `/api/calendar/eventos?vagaId=${encodeURIComponent(vagaId)}&daysBack=60&daysForward=30`,
          { cache: "no-store" },
        );
        if (cancelled) return;

        if (res.status === 409) {
          setNaoConfigurado(true);
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          setErrorMsg("Sessão expirada. Faça login novamente.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          setErrorMsg(body?.error ?? `Erro ao buscar calendário (HTTP ${res.status})`);
          setLoading(false);
          return;
        }

        const data = (await res.json()) as CalendarEventosResponse;
        if (cancelled) return;

        const importados = new Set(data.uidsImportados);
        setUidsImportados(importados);
        setEventos(data.eventos);

        const now = Date.now();
        const initialForms: Record<string, EventoForm> = {};
        for (const ev of data.eventos) {
          const { email, telefone } = extrairContato(ev.descricao);
          const jaImportado = importados.has(ev.uid);
          const inicioTs = ev.inicio ? new Date(ev.inicio).getTime() : null;
          const defaultStatus: StatusImportavel =
            inicioTs !== null && inicioTs < now ? "shortlist" : "entrevista";
          initialForms[ev.uid] = {
            nome: ev.nomeSugerido,
            email,
            telefone,
            status: defaultStatus,
            selecionado: !jaImportado,
          };
        }
        setForms(initialForms);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[ImportarAgendaDrawer] erro", err);
        setErrorMsg("Falha de rede ao buscar o calendário");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, vagaId, resetState]);

  const eventosVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const now = new Date();
    return eventos.filter((ev) => {
      // Busca por título ou nome
      if (termo) {
        const nomeAtual = forms[ev.uid]?.nome ?? ev.nomeSugerido;
        const alvo = `${ev.titulo} ${nomeAtual}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (filtro === "todos") return true;
      if (filtro === "naoImportados") return !uidsImportados.has(ev.uid);
      if (!ev.inicio) return false;
      const d = new Date(ev.inicio);
      if (filtro === "proximos30") {
        const limite = now.getTime() + 30 * 86400 * 1000;
        return d.getTime() >= now.getTime() - 86400 * 1000 && d.getTime() <= limite;
      }
      if (filtro === "ultimos60") {
        const limite = now.getTime() - 60 * 86400 * 1000;
        return d.getTime() <= now.getTime() && d.getTime() >= limite;
      }
      if (filtro === "estaSemana") {
        return isSameWeek(d, now);
      }
      return true;
    });
  }, [eventos, busca, filtro, forms, uidsImportados]);

  const selecionadosCount = useMemo(
    () =>
      eventosVisiveis.reduce(
        (acc, ev) => acc + (forms[ev.uid]?.selecionado ? 1 : 0),
        0,
      ),
    [eventosVisiveis, forms],
  );

  const updateForm = (uid: string, patch: Partial<EventoForm>) => {
    setForms((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], ...patch },
    }));
  };

  const marcarTodos = (valor: boolean) => {
    setForms((prev) => {
      const next = { ...prev };
      for (const ev of eventosVisiveis) {
        if (uidsImportados.has(ev.uid)) continue;
        if (next[ev.uid]) {
          next[ev.uid] = { ...next[ev.uid], selecionado: valor };
        }
      }
      return next;
    });
  };

  const handleImportar = () => {
    const itens = eventos
      .filter((ev) => !uidsImportados.has(ev.uid) && forms[ev.uid]?.selecionado)
      .map((ev) => {
        const f = forms[ev.uid];
        const email = f.email.trim();
        const telefone = f.telefone.trim();
        return {
          uid: ev.uid,
          nome: f.nome.trim() || ev.nomeSugerido,
          email: email ? email : null,
          telefone: telefone ? telefone : null,
          status: f.status,
          notas: null,
        };
      });

    if (itens.length === 0) {
      toast.error("Selecione ao menos um evento");
      return;
    }

    // Valida nomes
    const semNome = itens.find((i) => !i.nome);
    if (semNome) {
      toast.error("Todos os selecionados precisam ter um nome");
      return;
    }

    startImportTransition(async () => {
      const result = await importarCandidatosDaAgenda(vagaId, { itens });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const parts: string[] = [];
      parts.push(
        `${result.importados} candidato${result.importados === 1 ? "" : "s"} importado${result.importados === 1 ? "" : "s"}`,
      );
      if (result.duplicadosIgnorados > 0) {
        parts.push(
          `${result.duplicadosIgnorados} duplicado${result.duplicadosIgnorados === 1 ? "" : "s"} ignorado${result.duplicadosIgnorados === 1 ? "" : "s"}`,
        );
      }
      toast.success(parts.join(" · "));
      router.refresh();
      onClose();
    });
  };

  const goConfiguracoes = () => {
    onClose();
    router.push("/configuracoes");
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-label="Importar da agenda"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-raised"
          >
            {/* Header */}
            <header className="flex items-start gap-3 border-b border-slate-100 px-6 pb-4 pt-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal-50 text-royal-700">
                <Calendar size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">
                    Importar da agenda
                  </h2>
                  <Sparkles size={14} className="text-lima-600" aria-hidden />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {loading || naoConfigurado || errorMsg
                    ? "Conecte seu Google Agenda para trazer candidatos automaticamente"
                    : `${selecionadosCount} selecionado${selecionadosCount === 1 ? "" : "s"} de ${eventosVisiveis.length} evento${eventosVisiveis.length === 1 ? "" : "s"}`}
                </p>
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

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col">
              {loading ? (
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/70 p-4"
                    >
                      <div className="skeleton mb-3 h-4 w-2/3" />
                      <div className="skeleton mb-2 h-3 w-1/3" />
                      <div className="skeleton h-9 w-full" />
                    </div>
                  ))}
                </div>
              ) : naoConfigurado ? (
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-royal-50 text-royal-700">
                    <Calendar size={40} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    Você ainda não conectou seu Google Agenda
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Conecte a URL secreta do seu calendário para trazer
                    entrevistas e candidatos direto pra cá.
                  </p>
                  <button
                    type="button"
                    onClick={goConfiguracoes}
                    className="btn-primary mt-6 inline-flex items-center gap-2"
                  >
                    Conectar agora
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <AlertTriangle size={32} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    Não foi possível carregar a agenda
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={goConfiguracoes}
                    className="btn-secondary mt-6 inline-flex items-center gap-2"
                  >
                    Ir para configurações
                    <ExternalLink size={14} />
                  </button>
                </div>
              ) : eventos.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Calendar size={30} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    Nenhuma entrevista encontrada
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Não encontramos eventos nos últimos 60 dias nem nos próximos
                    30 dias.
                  </p>
                </div>
              ) : (
                <>
                  {/* Controles */}
                  <div className="space-y-3 border-b border-slate-100 px-6 py-4">
                    <div className="relative">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      />
                      <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por título ou nome…"
                        className="input pl-9"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {FILTROS.map((f) => {
                        const ativo = filtro === f.value;
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFiltro(f.value)}
                            className={
                              ativo
                                ? "chip chip-active px-3 py-1 text-xs"
                                : "chip px-3 py-1 text-xs"
                            }
                            aria-pressed={ativo}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {eventosVisiveis.length} evento
                        {eventosVisiveis.length === 1 ? "" : "s"} na lista
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => marcarTodos(true)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          Marcar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => marcarTodos(false)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          Desmarcar todos
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {eventosVisiveis.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
                        Nenhum evento corresponde aos filtros atuais.
                      </div>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {eventosVisiveis.map((ev) => {
                          const f = forms[ev.uid];
                          if (!f) return null;
                          const jaImportado = uidsImportados.has(ev.uid);
                          const dataLabel = ev.inicio
                            ? `${formatDateBR(new Date(ev.inicio))}${
                                ev.allDay ? "" : " · " + formatHora(ev.inicio)
                              }`
                            : "Sem data";

                          return (
                            <li
                              key={ev.uid}
                              className={`rounded-xl border border-slate-200/70 bg-white p-4 shadow-xs transition ${
                                jaImportado
                                  ? "opacity-60"
                                  : "hover:-translate-y-0.5 hover:shadow-card-hover"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <label className="mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white text-royal transition hover:border-royal aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
                                  <input
                                    type="checkbox"
                                    checked={f.selecionado}
                                    disabled={jaImportado}
                                    onChange={(e) =>
                                      updateForm(ev.uid, {
                                        selecionado: e.target.checked,
                                      })
                                    }
                                    className="sr-only"
                                    aria-label={`Selecionar ${ev.titulo}`}
                                  />
                                  {f.selecionado && !jaImportado && (
                                    <Check size={14} />
                                  )}
                                </label>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-bold text-ink">
                                        {ev.titulo}
                                      </div>
                                      <div className="mt-0.5 text-xs text-slate-500">
                                        {dataLabel}
                                        {ev.local ? ` · ${ev.local}` : ""}
                                      </div>
                                    </div>
                                    {jaImportado && (
                                      <span className="badge-green inline-flex items-center gap-1">
                                        <CheckCircle2 size={12} />
                                        Já importado
                                      </span>
                                    )}
                                  </div>

                                  {!jaImportado && (
                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <div className="sm:col-span-2">
                                        <label className="label">
                                          Nome do candidato
                                        </label>
                                        <input
                                          type="text"
                                          value={f.nome}
                                          onChange={(e) =>
                                            updateForm(ev.uid, {
                                              nome: e.target.value,
                                            })
                                          }
                                          className="input"
                                        />
                                      </div>
                                      <div>
                                        <label className="label">E-mail</label>
                                        <input
                                          type="email"
                                          value={f.email}
                                          onChange={(e) =>
                                            updateForm(ev.uid, {
                                              email: e.target.value,
                                            })
                                          }
                                          placeholder="opcional"
                                          className="input"
                                        />
                                      </div>
                                      <div>
                                        <label className="label">
                                          Telefone
                                        </label>
                                        <input
                                          type="tel"
                                          value={f.telefone}
                                          onChange={(e) =>
                                            updateForm(ev.uid, {
                                              telefone: e.target.value,
                                            })
                                          }
                                          placeholder="opcional"
                                          className="input"
                                        />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <label className="label">Status</label>
                                        <select
                                          value={f.status}
                                          onChange={(e) =>
                                            updateForm(ev.uid, {
                                              status: e.target
                                                .value as StatusImportavel,
                                            })
                                          }
                                          className="input"
                                        >
                                          {STATUS_OPTIONS.map((o) => (
                                            <option
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportar}
                disabled={
                  isImporting ||
                  loading ||
                  naoConfigurado ||
                  !!errorMsg ||
                  selecionadosCount === 0
                }
                className="btn-primary"
              >
                {isImporting
                  ? "Importando…"
                  : `Importar ${selecionadosCount} candidato${selecionadosCount === 1 ? "" : "s"}`}
              </button>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
