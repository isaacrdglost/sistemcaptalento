"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import type { EstagioLead } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { moverEstagio } from "@/app/comercial/actions";
import { descricaoOrigemLead } from "@/lib/activity-lead";
import { formatRelative } from "@/lib/business-days";
import type { LeadRow } from "@/components/LeadList";

type ColEstagio = "novo" | "qualificado" | "proposta" | "negociacao";

interface LeadKanbanProps {
  leads: LeadRow[];
  currentUserId: string;
  isAdmin: boolean;
  onAbrirGanho: (leadId: string) => void;
  onAbrirPerdido: (leadId: string) => void;
}

interface ColumnDef {
  value: ColEstagio;
  label: string;
  /** classes para a borda lateral colorida do header */
  barClass: string;
  /** classes pra ringo/highlight da coluna durante drag-over */
  hoverRing: string;
  hoverBg: string;
  /** classes de fundo padrão */
  baseBorder: string;
  baseBg: string;
  /** badge de contagem */
  countBadge: string;
}

const COLUMNS: ColumnDef[] = [
  {
    value: "novo",
    label: "Novo",
    barClass: "bg-slate-300",
    hoverRing: "ring-slate-200",
    hoverBg: "bg-slate-50/60",
    baseBorder: "border-slate-300",
    baseBg: "bg-slate-50/40",
    countBadge: "bg-slate-100 text-slate-600",
  },
  {
    value: "qualificado",
    label: "Qualificado",
    barClass: "bg-royal-300",
    hoverRing: "ring-royal-200",
    hoverBg: "bg-royal-50/40",
    baseBorder: "border-royal-200",
    baseBg: "bg-royal-50/40",
    countBadge: "bg-royal-50 text-royal-700",
  },
  {
    value: "proposta",
    label: "Proposta",
    barClass: "bg-amber-300",
    hoverRing: "ring-amber-200",
    hoverBg: "bg-amber-50/50",
    baseBorder: "border-amber-200",
    baseBg: "bg-amber-50/40",
    countBadge: "bg-amber-50 text-amber-700",
  },
  {
    value: "negociacao",
    label: "Negociação",
    barClass: "bg-amber-400",
    hoverRing: "ring-amber-300",
    hoverBg: "bg-amber-50/70",
    baseBorder: "border-amber-300",
    baseBg: "bg-amber-50/60",
    countBadge: "bg-amber-50 text-amber-800",
  },
];

interface CardMenuProps {
  leadId: string;
  onAbrirGanho: () => void;
  onAbrirPerdido: () => void;
}

function CardMenu({ leadId, onAbrirGanho, onAbrirPerdido }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Abrir menu do lead"
        title="Mais ações"
        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-white shadow-pop"
        >
          <Link
            href={`/comercial/leads/${leadId}`}
            className="block px-3 py-2 text-xs font-medium text-ink transition hover:bg-slate-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Abrir detalhes
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAbrirGanho();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-lima-700 transition hover:bg-lima-50"
          >
            Marcar como ganho
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAbrirPerdido();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            Marcar como perdido
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function LeadKanban({
  leads,
  currentUserId,
  isAdmin,
  onAbrirGanho,
  onAbrirPerdido,
}: LeadKanbanProps) {
  const router = useRouter();
  const [items, setItems] = useState<LeadRow[]>(() =>
    leads.filter(
      (l) =>
        !l.arquivado && l.estagio !== "ganho" && l.estagio !== "perdido",
    ),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<ColEstagio | null>(null);
  const [, startTransition] = useTransition();

  // Resincroniza ao receber novas props (após router.refresh)
  useEffect(() => {
    setItems(
      leads.filter(
        (l) =>
          !l.arquivado &&
          l.estagio !== "ganho" &&
          l.estagio !== "perdido",
      ),
    );
  }, [leads]);

  function podeArrastar(lead: LeadRow): boolean {
    if (isAdmin) return true;
    if (lead.responsavelId === null) return true;
    return lead.responsavelId === currentUserId;
  }

  const grouped: Record<ColEstagio, LeadRow[]> = {
    novo: [],
    qualificado: [],
    proposta: [],
    negociacao: [],
  };
  for (const lead of items) {
    if (
      lead.estagio === "novo" ||
      lead.estagio === "qualificado" ||
      lead.estagio === "proposta" ||
      lead.estagio === "negociacao"
    ) {
      grouped[lead.estagio].push(lead);
    }
  }

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    lead: LeadRow,
  ) {
    if (!podeArrastar(lead)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(lead.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setHoverCol(null);
  }

  function handleDragOver(
    e: React.DragEvent<HTMLDivElement>,
    col: ColEstagio,
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverCol !== col) setHoverCol(col);
  }

  function handleDragLeave(col: ColEstagio) {
    if (hoverCol === col) setHoverCol(null);
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    col: ColEstagio,
  ) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setHoverCol(null);
    setDraggingId(null);
    if (!id) return;

    const atual = items.find((l) => l.id === id);
    if (!atual) return;
    if (atual.estagio === col) return;
    if (!podeArrastar(atual)) {
      toast.error("Você não tem permissão pra mover este lead");
      return;
    }

    const estagioAnterior = atual.estagio as EstagioLead;

    // Optimistic
    setItems((prev) =>
      prev.map((l) =>
        l.id === id
          ? ({ ...l, estagio: col, updatedAt: new Date() } as LeadRow)
          : l,
      ),
    );

    startTransition(async () => {
      const result = await moverEstagio(id, col);
      if ("error" in result) {
        toast.error(result.error);
        // revert
        setItems((prev) =>
          prev.map((l) =>
            l.id === id ? ({ ...l, estagio: estagioAnterior }) : l,
          ),
        );
        return;
      }
      toast.success("Lead movido");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const lista = grouped[col.value];
        const isHover = hoverCol === col.value;
        return (
          <div
            key={col.value}
            onDragOver={(e) => handleDragOver(e, col.value)}
            onDragLeave={() => handleDragLeave(col.value)}
            onDrop={(e) => handleDrop(e, col.value)}
            className={`flex flex-col rounded-xl border ${col.baseBorder} ${col.baseBg} transition ${
              isHover ? `ring-2 ${col.hoverRing} ${col.hoverBg}` : ""
            }`}
          >
            <div className={`h-1 w-full rounded-t-xl ${col.barClass}`} />
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {col.label}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${col.countBadge}`}
                >
                  {lista.length}
                </span>
              </div>
            </div>

            <div className="flex max-h-[640px] flex-col gap-2 overflow-y-auto px-2 pb-3 pr-2">
              {lista.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-8 text-center">
                  Vazio
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {lista.map((lead) => {
                    const arrastavel = podeArrastar(lead);
                    return (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
                        }}
                        draggable={arrastavel}
                        onDragStart={(e) =>
                          handleDragStart(
                            e as unknown as React.DragEvent<HTMLDivElement>,
                            lead,
                          )
                        }
                        onDragEnd={handleDragEnd}
                        className={`group rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs transition ${
                          arrastavel
                            ? "cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-card-hover"
                            : "cursor-not-allowed opacity-60"
                        } ${
                          draggingId === lead.id
                            ? "opacity-40 ring-2 ring-royal-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/comercial/leads/${lead.id}`}
                              className="block truncate font-semibold text-sm text-ink transition hover:text-royal"
                            >
                              {lead.razaoSocial}
                            </Link>
                            {lead.nomeFantasia ? (
                              <div className="truncate text-xs text-slate-500">
                                {lead.nomeFantasia}
                              </div>
                            ) : null}
                          </div>
                          <CardMenu
                            leadId={lead.id}
                            onAbrirGanho={() => onAbrirGanho(lead.id)}
                            onAbrirPerdido={() => onAbrirPerdido(lead.id)}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {lead.responsavel ? (
                              <Avatar
                                nome={lead.responsavel.nome}
                                size="xs"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="h-6 w-6 shrink-0 rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
                              />
                            )}
                            <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {descricaoOrigemLead(lead.origem)}
                            </span>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatRelative(lead.createdAt)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
