"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeadTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

const MAX_TAGS = 20;
const MAX_TAG_LEN = 40;
const MAX_SUGESTOES = 8;

/**
 * Input de tags com chips removíveis e autocomplete. Carrega a lista
 * global de tags em uso via `/api/leads/tags` (debounce de 300ms ao
 * digitar/abrir). Filtra localmente com `startsWith` case-insensitive.
 *
 * Atalhos:
 *  - Enter ou vírgula adiciona a tag atual (ou a sugestão destacada)
 *  - Backspace numa input vazia remove a última tag
 *  - Setas pra navegar nas sugestões, Escape fecha o popover
 */
export function LeadTagInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Adicionar tag e Enter",
  ariaLabel,
}: LeadTagInputProps) {
  const reactId = useId();
  const inputId = `${reactId}-tag-input`;
  const listId = `${reactId}-tag-list`;
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [todasTags, setTodasTags] = useState<string[]>([]);
  const [carregadas, setCarregadas] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/leads/tags", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tags?: string[] };
      if (Array.isArray(data.tags)) {
        setTodasTags(data.tags);
      }
    } catch {
      // silencioso — autocomplete é progressivo, lista vazia é aceitável
    } finally {
      setCarregadas(true);
    }
  }, []);

  // Click fora fecha o popover
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Debounce do fetch quando o draft muda — evita disparar a cada tecla
  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void fetchTags();
    }, 300);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [draft, disabled, fetchTags]);

  const sugestoes = useMemo(() => {
    const draftNorm = draft.trim().toLowerCase();
    const usadas = new Set(value.map((t) => t.toLowerCase()));
    const filtradas = todasTags.filter((t) => {
      if (usadas.has(t.toLowerCase())) return false;
      if (!draftNorm) return true;
      return t.toLowerCase().startsWith(draftNorm);
    });
    return filtradas.slice(0, MAX_SUGESTOES);
  }, [draft, todasTags, value]);

  // Mantém o highlight válido quando a lista filtrada muda
  useEffect(() => {
    if (highlight >= sugestoes.length) {
      setHighlight(sugestoes.length > 0 ? 0 : -1);
    }
  }, [sugestoes.length, highlight]);

  function addTag(raw: string) {
    const t = raw.trim().slice(0, MAX_TAG_LEN);
    if (!t) return;
    if (value.length >= MAX_TAGS) return;
    const existe = value.some((v) => v.toLowerCase() === t.toLowerCase());
    if (existe) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
    setHighlight(-1);
  }

  function removeTag(idx: number) {
    if (disabled) return;
    const next = value.slice(0, idx).concat(value.slice(idx + 1));
    onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (open && highlight >= 0 && sugestoes[highlight]) {
        addTag(sugestoes[highlight]);
      } else if (draft.trim()) {
        addTag(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
      return;
    }
    if (e.key === "ArrowDown") {
      if (sugestoes.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((prev) => {
        const next = prev + 1;
        return next >= sugestoes.length ? 0 : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      if (sugestoes.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((prev) => {
        const next = prev - 1;
        return next < 0 ? sugestoes.length - 1 : next;
      });
      return;
    }
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setHighlight(-1);
      }
    }
  }

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    if (!carregadas) {
      void fetchTags();
    }
  }

  const limiteAtingido = value.length >= MAX_TAGS;
  const mostrarPopover =
    open && !disabled && !limiteAtingido && sugestoes.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm transition-all duration-150",
          "focus-within:border-royal focus-within:ring-2 focus-within:ring-royal-100",
          "hover:border-line-strong",
          disabled && "cursor-not-allowed bg-slate-50",
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        {value.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            <span className="truncate max-w-[12rem]">{tag}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remover tag ${tag}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(idx);
                }}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-ink"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled || limiteAtingido}
          placeholder={limiteAtingido ? `Limite de ${MAX_TAGS} tags` : placeholder}
          aria-label={ariaLabel ?? "Adicionar tag"}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={mostrarPopover}
          maxLength={MAX_TAG_LEN}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-transparent"
        />
      </div>

      <AnimatePresence>
        {mostrarPopover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 z-50 mt-1.5 origin-top overflow-hidden rounded-xl border border-line/70 bg-white shadow-lg"
          >
            <ul
              id={listId}
              role="listbox"
              className="max-h-64 overflow-y-auto p-1"
            >
              {sugestoes.map((tag, idx) => {
                const ativo = idx === highlight;
                return (
                  <li
                    key={tag}
                    role="option"
                    aria-selected={ativo}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      // mousedown pra disparar antes do blur do input
                      e.preventDefault();
                      addTag(tag);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-1.5 text-sm transition",
                      ativo ? "bg-royal-50 text-royal-700" : "text-ink",
                    )}
                  >
                    {tag}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
