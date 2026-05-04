"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  ArchiveRestore,
  ArrowUpRight,
  Hand,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import type { EstagioLead, OrigemLead } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  arquivarLead,
  pegarLead,
  reabrirLead,
} from "@/app/comercial/actions";
import {
  descricaoEstagioLead,
  descricaoOrigemLead,
} from "@/lib/activity-lead";
import { formatPhone } from "@/lib/format";
import { formatRelative } from "@/lib/business-days";

export type LeadRow = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  contatoNome: string | null;
  email: string | null;
  telefone: string | null;
  estagio: EstagioLead;
  origem: OrigemLead;
  responsavelId: string | null;
  responsavel: { id: string; nome: string } | null;
  arquivado: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

interface LeadListProps {
  leads: LeadRow[];
  currentUserId: string;
  isAdmin: boolean;
  podeArquivar: boolean;
}

const ESTAGIO_BADGE: Record<EstagioLead, string> = {
  novo: "badge-dot bg-slate-100 text-slate-600 ring-slate-200",
  qualificado: "badge-dot bg-royal-50 text-royal-700 ring-royal-100",
  proposta: "badge-dot bg-amber-50 text-amber-700 ring-amber-100",
  negociacao: "badge-dot bg-amber-50 text-amber-700 ring-amber-100",
  ganho: "badge-dot bg-lima-50 text-lima-700 ring-lima-100",
  perdido: "badge-dot bg-red-50 text-red-700 ring-red-100",
};

export function LeadList({
  leads,
  currentUserId,
  isAdmin,
  podeArquivar,
}: LeadListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function handlePegar(id: string) {
    startTransition(async () => {
      const result = await pegarLead(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Lead atribuído a você");
      router.refresh();
    });
  }

  async function handleArquivar(id: string, arquivado: boolean) {
    if (!arquivado) {
      const ok = await confirm({
        title: "Arquivar lead",
        message:
          "Leads arquivados ficam fora da listagem padrão. Você pode reabrir depois.",
        confirmLabel: "Arquivar",
        danger: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const result = arquivado
        ? await reabrirLead(id)
        : await arquivarLead(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(arquivado ? "Lead reaberto" : "Lead arquivado");
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 text-left text-eyebrow uppercase text-slate-500 border-b border-line/70">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Empresa</th>
              <th className="px-4 py-2.5 font-semibold">Contato</th>
              <th className="px-4 py-2.5 font-semibold">Estágio</th>
              <th className="px-4 py-2.5 font-semibold">Origem</th>
              <th className="px-4 py-2.5 font-semibold">Responsável</th>
              <th className="px-4 py-2.5 font-semibold">Atualizado</th>
              <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70 bg-white">
            {leads.map((lead, i) => {
              const isMine = lead.responsavelId === currentUserId;
              const semResponsavel = lead.responsavelId === null;
              const podeArquivarLinha =
                podeArquivar && (isAdmin || isMine);
              return (
                <tr
                  key={lead.id}
                  className="group animate-fade-in-up transition hover:bg-slate-50/30"
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                >
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/comercial/leads/${lead.id}`}
                      className="font-semibold text-ink transition hover:text-royal"
                    >
                      {lead.razaoSocial}
                    </Link>
                    {lead.nomeFantasia ? (
                      <div className="text-xs text-slate-500">
                        {lead.nomeFantasia}
                      </div>
                    ) : null}
                    {lead.tags && lead.tags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {lead.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200"
                          >
                            {t}
                          </span>
                        ))}
                        {lead.tags.length > 3 ? (
                          <span
                            className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-inset ring-slate-200"
                            title={lead.tags.slice(3).join(", ")}
                          >
                            +{lead.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {lead.arquivado ? (
                      <div className="mt-1">
                        <span className="badge-slate">Arquivado</span>
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {lead.contatoNome ? (
                      <div className="font-medium text-ink">
                        {lead.contatoNome}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {lead.email ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          <Mail size={11} className="shrink-0" />
                          <span className="truncate max-w-[12rem]">
                            {lead.email}
                          </span>
                        </span>
                      ) : null}
                      {lead.telefone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          <Phone size={11} className="shrink-0" />
                          <span>{formatPhone(lead.telefone)}</span>
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span className={ESTAGIO_BADGE[lead.estagio]}>
                      {descricaoEstagioLead(lead.estagio)}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span className="badge-slate">
                      {descricaoOrigemLead(lead.origem)}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {lead.responsavel ? (
                      <div className="flex items-center gap-2">
                        <Avatar nome={lead.responsavel.nome} size="xs" />
                        <span className="text-sm text-ink">
                          {lead.responsavel.nome}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        Sem responsável
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {formatRelative(lead.updatedAt)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1">
                      {semResponsavel ? (
                        <button
                          type="button"
                          onClick={() => handlePegar(lead.id)}
                          disabled={isPending}
                          className="btn-ghost text-xs"
                          title="Atribuir esse lead a você"
                        >
                          <Hand size={13} />
                          <span>Pegar pra mim</span>
                        </button>
                      ) : null}

                      <Link
                        href={`/comercial/leads/${lead.id}`}
                        className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-semibold text-royal transition hover:bg-royal-50"
                      >
                        Abrir
                        <ArrowUpRight
                          size={12}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>

                      {podeArquivarLinha ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleArquivar(lead.id, lead.arquivado)
                          }
                          disabled={isPending}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                          title={lead.arquivado ? "Reabrir" : "Arquivar"}
                          aria-label={
                            lead.arquivado ? "Reabrir lead" : "Arquivar lead"
                          }
                        >
                          {lead.arquivado ? (
                            <ArchiveRestore size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
