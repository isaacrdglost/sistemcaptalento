"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Calendar,
  FileText,
  Linkedin,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { StatusCandidato } from "@prisma/client";
import {
  adicionarCandidato,
  atualizarStatusCandidato,
  removerCandidato,
} from "@/app/vagas/[id]/actions";
import {
  CandidatoDrawer,
  type CandidatoComAnalises,
} from "./CandidatoDrawer";
import { useConfirm } from "./ConfirmDialog";
import { ImportarAgendaDrawer } from "./ImportarAgendaDrawer";
import { Select } from "@/components/ui/Select";

interface CandidatoListProps {
  vagaId: string;
  candidatos: CandidatoComAnalises[];
  canEdit: boolean;
}

const STATUS_OPTIONS: {
  value: StatusCandidato;
  label: string;
  badgeClass: string;
}[] = [
  { value: "triagem", label: "Triagem", badgeClass: "badge-slate" },
  { value: "entrevista", label: "Entrevista", badgeClass: "badge-royal" },
  { value: "shortlist", label: "Shortlist", badgeClass: "badge-lima" },
  { value: "aprovado", label: "Aprovado", badgeClass: "badge-green" },
  { value: "reprovado", label: "Reprovado", badgeClass: "badge-red" },
];

const RESULTADO_BADGE: Record<string, { label: string; badgeClass: string }> = {
  limpa: { label: "Limpa", badgeClass: "badge-green" },
  com_ocorrencias: { label: "Ocorrências", badgeClass: "badge-red" },
  inconclusivo: { label: "Inconclusivo", badgeClass: "badge-amber" },
  pendente: { label: "Pendente", badgeClass: "badge-slate" },
};

function badgeClassFor(status: StatusCandidato): string {
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.badgeClass ?? "badge-slate"
  );
}

function statusLabel(status: StatusCandidato): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ScoreStars({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-slate-400">Sem score</span>;
  }
  return (
    <div
      className="flex items-center gap-0.5 text-amber-400"
      aria-label={`Score ${score} de 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= score ? "fill-amber-400" : "fill-transparent text-slate-300"
          }
        />
      ))}
    </div>
  );
}

function StatusPill({
  status,
  disabled,
  onChange,
  canEdit,
}: {
  status: StatusCandidato;
  disabled: boolean;
  onChange: (s: StatusCandidato) => void;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return <span className={badgeClassFor(status)}>{statusLabel(status)}</span>;
  }
  return (
    <Select
      size="sm"
      value={status}
      onChange={(v) => onChange(v as StatusCandidato)}
      disabled={disabled}
      options={STATUS_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      }))}
      ariaLabel="Alterar status"
      className="min-w-[8rem]"
    />
  );
}

export function CandidatoList({
  vagaId,
  candidatos,
  canEdit,
}: CandidatoListProps) {
  const confirm = useConfirm();
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openCandidato, setOpenCandidato] =
    useState<CandidatoComAnalises | null>(null);
  const [importarOpen, setImportarOpen] = useState(false);

  // Quando o candidato aberto é atualizado do servidor, refresh referência
  useEffect(() => {
    if (!openCandidato) return;
    const atual = candidatos.find((c) => c.id === openCandidato.id);
    if (!atual) {
      setOpenCandidato(null);
      return;
    }
    if (atual !== openCandidato) {
      setOpenCandidato(atual);
    }
  }, [candidatos, openCandidato]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setError("Informe o nome do candidato");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adicionarCandidato(vagaId, trimmed);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setNome("");
        toast.success(`${trimmed} adicionado`);
      }
    });
  };

  const handleStatusChange = (
    candidatoId: string,
    status: StatusCandidato,
  ) => {
    startTransition(async () => {
      const result = await atualizarStatusCandidato(candidatoId, status);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setError(null);
      }
    });
  };

  const handleRemove = async (candidatoId: string, nomeCandidato: string) => {
    const ok = await confirm({
      title: "Remover candidato",
      message: `Tem certeza que deseja remover ${nomeCandidato}? Essa ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removerCandidato(candidatoId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Candidato removido");
      }
    });
  };

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-1">
        <h2 className="text-lg font-bold">Candidatos</h2>
        <span className="text-sm text-slate-500">
          {candidatos.length}{" "}
          {candidatos.length === 1 ? "candidato" : "candidatos"}
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Gerencie a lista e o andamento de cada candidato.
      </p>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setImportarOpen(true)}
            className="btn-secondary inline-flex items-center gap-1.5 py-1.5 px-3 text-sm"
          >
            <Calendar size={14} />
            Importar da agenda
          </button>
        </div>
      )}

      {candidatos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center animate-fade-in-up">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-royal-50 text-royal-700">
            <Users size={22} />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            Nenhum candidato ainda
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Adicione o primeiro candidato pelo formulário abaixo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidatos.map((c, idx) => {
            const temLinkedin = Boolean(c.linkedinUrl);
            const temCV = Boolean(c.cvArquivoUrl || c.linkCV);
            const ultimaAnalise = c.analises?.[0];
            const analiseMeta = ultimaAnalise
              ? RESULTADO_BADGE[ultimaAnalise.resultado]
              : null;
            return (
              <li
                key={c.id}
                className="group flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-royal text-xs font-bold text-white">
                  {iniciais(c.nome)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-ink">
                      {c.nome}
                    </span>
                    {temLinkedin && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        title="Possui LinkedIn"
                      >
                        <Linkedin size={10} />
                      </span>
                    )}
                    {temCV && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        title="Possui CV"
                      >
                        <FileText size={10} />
                      </span>
                    )}
                    {analiseMeta && (
                      <span
                        className={`${analiseMeta.badgeClass} inline-flex items-center gap-1 px-1.5 py-0 text-[10px]`}
                        title={`Análise: ${analiseMeta.label}`}
                      >
                        <ShieldCheck size={10} />
                        {analiseMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {c.email && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                    {c.telefone && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Phone size={12} className="shrink-0" />
                        <span className="truncate">{c.telefone}</span>
                      </span>
                    )}
                    {!c.email && !c.telefone && (
                      <span className="italic text-slate-400">
                        Sem contato registrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block">
                  <ScoreStars score={c.score} />
                </div>

                <StatusPill
                  status={c.status}
                  disabled={isPending || !canEdit}
                  onChange={(s) => handleStatusChange(c.id, s)}
                  canEdit={canEdit}
                />

                <button
                  type="button"
                  onClick={() => setOpenCandidato(c)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Abrir
                </button>

                {canEdit && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(c.id, c.nome)}
                    aria-label={`Remover ${c.nome}`}
                    title="Remover"
                    className="rounded px-2 py-1 text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <form
          onSubmit={handleAdd}
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 animate-fade-in-up"
        >
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do candidato"
            disabled={isPending}
            className="input flex-1 min-w-[200px]"
          />
          <button
            type="submit"
            disabled={isPending || !nome.trim()}
            className="btn-primary"
          >
            {isPending ? "Salvando…" : "Adicionar"}
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-3" role="alert">
          {error}
        </p>
      )}

      {openCandidato && (
        <CandidatoDrawer
          candidato={openCandidato}
          canEdit={canEdit}
          open={openCandidato !== null}
          onClose={() => setOpenCandidato(null)}
        />
      )}

      {canEdit && (
        <ImportarAgendaDrawer
          vagaId={vagaId}
          open={importarOpen}
          onClose={() => setImportarOpen(false)}
        />
      )}
    </section>
  );
}
