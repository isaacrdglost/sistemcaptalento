"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { MoreHorizontal, Star } from "lucide-react";
import type { Candidato, StatusCandidato } from "@prisma/client";
import { atualizarStatusCandidato } from "@/app/vagas/[id]/actions";

interface CandidatoKanbanProps {
  candidatos: Candidato[];
  canEdit: boolean;
  onOpenCandidato: (candidato: Candidato) => void;
}

interface ColumnDef {
  value: StatusCandidato;
  label: string;
  badgeClass: string;
}

const COLUMNS: ColumnDef[] = [
  { value: "triagem", label: "Triagem", badgeClass: "badge-slate" },
  { value: "entrevista", label: "Entrevista", badgeClass: "badge-royal" },
  { value: "shortlist", label: "Shortlist", badgeClass: "badge-lima" },
  { value: "aprovado", label: "Aprovado", badgeClass: "badge-green" },
  { value: "reprovado", label: "Reprovado", badgeClass: "badge-red" },
];

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ScoreStars({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={10}
          className={
            n <= score
              ? "fill-amber-400"
              : "fill-transparent text-slate-300"
          }
        />
      ))}
    </div>
  );
}

export function CandidatoKanban({
  candidatos,
  canEdit,
  onOpenCandidato,
}: CandidatoKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<StatusCandidato | null>(null);
  const [, startTransition] = useTransition();

  const grouped: Record<StatusCandidato, Candidato[]> = {
    triagem: [],
    entrevista: [],
    shortlist: [],
    aprovado: [],
    reprovado: [],
  };
  for (const c of candidatos) grouped[c.status].push(c);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    candidato: Candidato,
  ) => {
    if (!canEdit) return;
    e.dataTransfer.setData("text/candidato-id", candidato.id);
    e.dataTransfer.setData("text/candidato-status", candidato.status);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(candidato.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setHoverCol(null);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    status: StatusCandidato,
  ) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverCol !== status) setHoverCol(status);
  };

  const handleDragLeave = (status: StatusCandidato) => {
    if (hoverCol === status) setHoverCol(null);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    status: StatusCandidato,
  ) => {
    if (!canEdit) return;
    e.preventDefault();
    const candidatoId = e.dataTransfer.getData("text/candidato-id");
    const atual = e.dataTransfer.getData("text/candidato-status");
    setDraggingId(null);
    setHoverCol(null);
    if (!candidatoId) return;
    if (atual === status) return;
    startTransition(async () => {
      const result = await atualizarStatusCandidato(candidatoId, status);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Candidato movido");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = grouped[col.value];
        const isHover = hoverCol === col.value;
        return (
          <div
            key={col.value}
            onDragOver={(e) => handleDragOver(e, col.value)}
            onDragLeave={() => handleDragLeave(col.value)}
            onDrop={(e) => handleDrop(e, col.value)}
            className={`flex flex-col rounded-xl border bg-slate-50/60 p-2 transition ${
              isHover
                ? "border-royal-200 bg-royal-50/30 ring-2 ring-royal-200"
                : "border-slate-200/70"
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className={col.badgeClass}>{col.label}</span>
              <span className="text-xs font-semibold text-slate-500">
                {items.length}
              </span>
            </div>

            <div className="mt-2 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.div
                    key="empty"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400"
                  >
                    Vazio
                  </motion.div>
                ) : (
                  items.map((c) => (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      draggable={canEdit}
                      onDragStart={(e) =>
                        handleDragStart(
                          e as unknown as React.DragEvent<HTMLDivElement>,
                          c,
                        )
                      }
                      onDragEnd={handleDragEnd}
                      className={`group rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs transition ${
                        canEdit ? "cursor-grab active:cursor-grabbing" : ""
                      } ${
                        draggingId === c.id
                          ? "opacity-40 ring-2 ring-royal-200"
                          : "hover:-translate-y-0.5 hover:shadow-card-hover"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-royal text-[10px] font-bold text-white">
                          {iniciais(c.nome)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink">
                            {c.nome}
                          </div>
                          {c.email && (
                            <div className="truncate text-xs text-slate-500">
                              {c.email}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Abrir ${c.nome}`}
                          title="Abrir"
                          onClick={() => onOpenCandidato(c)}
                          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      {c.score !== null && c.score !== undefined && (
                        <div className="mt-2">
                          <ScoreStars score={c.score} />
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
