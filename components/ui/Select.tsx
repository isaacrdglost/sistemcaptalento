"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Texto secundário pequeno abaixo do label. */
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** ARIA label quando não houver `<label>` associado. */
  ariaLabel?: string;
  /** Tamanho. Default = "md". `sm` é mais compacto, usado em filtros densos. */
  size?: "sm" | "md";
}

/**
 * Select customizado seguindo o design system. Substitui o `<select>` nativo
 * em todo o app — o nativo herdava o tema do sistema operacional (escuro
 * em alguns macs/distros) e quebrava o visual.
 *
 * Comportamento:
 *  - Click abre dropdown com animação (framer-motion)
 *  - Setas pra cima/baixo navegam, Enter seleciona, Esc fecha
 *  - Click fora fecha
 *  - Auto-scroll mantém a opção destacada visível
 *  - `required` é honrado via input hidden (compatível com forms nativos)
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecionar…",
  disabled = false,
  required = false,
  id,
  name,
  className,
  ariaLabel,
  size = "md",
}: SelectProps) {
  const reactId = useId();
  const buttonId = id ?? reactId;
  const listId = `${buttonId}-list`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    direction: "down" | "up";
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(288, options.length * 40 + 8);
    const direction: "down" | "up" =
      spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? "up" : "down";
    setPos({
      top: direction === "down" ? rect.bottom + 6 : rect.top - 6,
      left: rect.left,
      width: rect.width,
      direction,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  // Click fora fecha (o popover é portalizado, então precisa marcar via data-attr)
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-select-popover]")
      ) {
        return;
      }
      close();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  // Ao abrir, posiciona highlight no item selecionado
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  // Auto-scroll do item destacado
  useEffect(() => {
    if (!open || highlight < 0) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-idx="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((prev) => {
        const next = prev + 1;
        return next >= options.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((prev) => {
        const next = prev - 1;
        return next < 0 ? options.length - 1 : next;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      if (open && highlight >= 0) {
        e.preventDefault();
        const opt = options[highlight];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          close();
        }
      } else if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Tab") {
      close();
    }
  }

  function pick(opt: SelectOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  }

  const compact = size === "sm";

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white text-left text-sm text-ink transition-all duration-150",
          "placeholder:text-slate-400",
          "focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-100",
          "hover:border-line-strong",
          "disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400",
          compact ? "h-8 px-2.5" : "h-10 px-3",
          open && "border-royal ring-2 ring-royal-100",
        )}
      >
        <span
          className={cn(
            "truncate",
            !selected && "text-slate-400",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180 text-royal",
          )}
        />
      </button>

      {/* Hidden input pra suportar `required` em forms nativos e enviar
          o valor quando o select estiver dentro de um <form>. */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                data-select-popover
                initial={{ opacity: 0, scale: 0.96, y: pos.direction === "down" ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: pos.direction === "down" ? -4 : 4 }}
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "fixed",
                  top: pos.direction === "down" ? pos.top : undefined,
                  bottom:
                    pos.direction === "up"
                      ? window.innerHeight - pos.top
                      : undefined,
                  left: pos.left,
                  width: pos.width,
                  transformOrigin: pos.direction === "down" ? "top" : "bottom",
                }}
                className="z-[200] overflow-hidden rounded-xl border border-line/70 bg-white shadow-xl ring-1 ring-black/5"
              >
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  aria-labelledby={buttonId}
                  className="max-h-72 overflow-y-auto p-1"
                >
                  {options.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-slate-400">
                      Nenhuma opção
                    </li>
                  ) : (
                    options.map((opt, idx) => {
                      const isSelected = opt.value === value;
                      const isHighlighted = idx === highlight;
                      return (
                        <li
                          key={opt.value}
                          data-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={opt.disabled || undefined}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => pick(opt)}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition",
                            opt.disabled
                              ? "cursor-not-allowed text-slate-300"
                              : isHighlighted
                                ? "bg-royal-50 text-royal-700"
                                : "text-ink",
                            isSelected && "font-semibold",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="block truncate text-xs text-slate-500">
                                {opt.description}
                              </span>
                            )}
                          </span>
                          {isSelected && (
                            <Check
                              size={14}
                              strokeWidth={3}
                              className="shrink-0 text-royal"
                            />
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
