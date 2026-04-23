"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Star,
  X,
} from "lucide-react";
import type { Candidato, StatusCandidato } from "@prisma/client";
import { editarCandidato } from "@/app/vagas/[id]/actions";
import { formatDateBR } from "@/lib/business-days";

interface CandidatoDrawerProps {
  candidato: Candidato;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
}

type Tab = "detalhes" | "notas";

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

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

export function CandidatoDrawer({
  candidato,
  canEdit,
  open,
  onClose,
}: CandidatoDrawerProps) {
  const [tab, setTab] = useState<Tab>("detalhes");

  const [nome, setNome] = useState(candidato.nome);
  const [email, setEmail] = useState(candidato.email ?? "");
  const [telefone, setTelefone] = useState(candidato.telefone ?? "");
  const [linkCV, setLinkCV] = useState(candidato.linkCV ?? "");
  const [score, setScore] = useState<number | null>(candidato.score ?? null);
  const [notas, setNotas] = useState(candidato.notas ?? "");

  const [isPendingDetails, startDetailsTransition] = useTransition();
  const [isPendingNotas, startNotasTransition] = useTransition();

  // Sincroniza o estado com a prop sempre que trocar de candidato ou reabrir
  useEffect(() => {
    setNome(candidato.nome);
    setEmail(candidato.email ?? "");
    setTelefone(candidato.telefone ?? "");
    setLinkCV(candidato.linkCV ?? "");
    setScore(candidato.score ?? null);
    setNotas(candidato.notas ?? "");
    setTab("detalhes");
  }, [
    candidato.id,
    candidato.nome,
    candidato.email,
    candidato.telefone,
    candidato.linkCV,
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

  const handleSalvarDetalhes = () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast.error("Informe o nome do candidato");
      return;
    }
    startDetailsTransition(async () => {
      const result = await editarCandidato(candidato.id, {
        nome: nomeTrim,
        email: email.trim() ? email.trim() : null,
        telefone: telefone.trim() ? telefone.trim() : null,
        linkCV: linkCV.trim() ? linkCV.trim() : null,
        notas: notas.trim() ? notas : null,
        score: score,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Detalhes atualizados");
      }
    });
  };

  const handleSalvarNotas = () => {
    startNotasTransition(async () => {
      const result = await editarCandidato(candidato.id, {
        nome: candidato.nome,
        email: candidato.email ?? null,
        telefone: candidato.telefone ?? null,
        linkCV: candidato.linkCV ?? null,
        notas: notas.trim() ? notas : null,
        score: candidato.score ?? null,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Notas salvas");
      }
    });
  };

  const readOnly = !canEdit;

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
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-royal text-sm font-bold text-white">
                {iniciais(candidato.nome)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-ink">
                  {candidato.nome}
                </div>
                <div className="mt-1 flex items-center gap-2">
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

            <div className="mt-6 flex gap-1 rounded-lg bg-slate-100 p-1">
              {(["detalhes", "notas"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === t
                      ? "text-ink"
                      : "text-slate-500 hover:text-ink"
                  }`}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="candidatodrawer-tab-indicator"
                      className="absolute inset-0 rounded-md bg-white shadow-xs"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">
                    {t === "detalhes" ? "Detalhes" : "Notas"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <AnimatePresence mode="wait">
                {tab === "detalhes" ? (
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
                      <label className="label" htmlFor="drawer-cv">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText size={12} /> Link do CV
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="drawer-cv"
                          type="url"
                          value={linkCV}
                          onChange={(e) => setLinkCV(e.target.value)}
                          disabled={readOnly || isPendingDetails}
                          placeholder="https://..."
                          className="input flex-1"
                        />
                        {linkCV && (
                          <a
                            href={linkCV}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            aria-label="Abrir link do CV"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
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
                          disabled={isPendingDetails}
                          className="btn-primary w-full"
                        >
                          {isPendingDetails ? "Salvando…" : "Salvar"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
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
    </AnimatePresence>
  );
}
