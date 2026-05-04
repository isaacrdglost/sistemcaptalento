"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Globe,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Sparkles,
  StickyNote,
  Trash2,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { TipoAtividadeLead } from "@prisma/client";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  excluirAtividade,
  marcarFollowupConcluido,
} from "@/app/comercial/actions";
import { formatDateBR, formatRelative } from "@/lib/business-days";

interface AtividadeItem {
  id: string;
  tipo: TipoAtividadeLead;
  descricao: string;
  metadata: unknown;
  agendadoPara: Date | null;
  concluidoEm: Date | null;
  createdAt: Date;
  autor: { id: string; nome: string };
}

interface AtividadeLeadFeedProps {
  atividades: AtividadeItem[];
  currentUserId: string;
  isAdmin: boolean;
}

interface IconSpec {
  Icon: LucideIcon;
  color: string;
  bg: string;
  ring: string;
}

const ICON_BY_TIPO: Record<TipoAtividadeLead, IconSpec> = {
  ligacao: {
    Icon: Phone,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  email: {
    Icon: Mail,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  reuniao: {
    Icon: CalendarCheck,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  whatsapp: {
    Icon: MessageCircle,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  nota: {
    Icon: StickyNote,
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  followup_agendado: {
    Icon: Bell,
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  followup_concluido: {
    Icon: CheckCircle2,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  mudanca_estagio: {
    Icon: ArrowRight,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  lead_capturado_site: {
    Icon: Globe,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  lead_ganho: {
    Icon: Sparkles,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  lead_perdido: {
    Icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  lead_arquivado: {
    Icon: Archive,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  lead_atribuido: {
    Icon: UserCheck,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
};

const VERBO_BY_TIPO: Record<TipoAtividadeLead, string> = {
  ligacao: "registrou uma ligação",
  email: "registrou um e-mail",
  reuniao: "registrou uma reunião",
  whatsapp: "registrou um WhatsApp",
  nota: "deixou uma nota",
  followup_agendado: "agendou um follow-up",
  followup_concluido: "concluiu um follow-up",
  mudanca_estagio: "",
  lead_capturado_site: "lead capturado pelo site",
  lead_ganho: "",
  lead_perdido: "",
  lead_arquivado: "",
  lead_atribuido: "",
};

const TIPOS_AUTOMATICOS = new Set<TipoAtividadeLead>([
  "mudanca_estagio",
  "lead_ganho",
  "lead_perdido",
  "lead_arquivado",
  "lead_atribuido",
  "lead_capturado_site",
]);

function primeiroNome(nome: string): string {
  const parte = nome.trim().split(/\s+/)[0];
  return parte || "Alguém";
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function diasDeDiferenca(target: Date, now: Date): number {
  const a = startOfDay(now).getTime();
  const b = startOfDay(target).getTime();
  return Math.round((b - a) / 86400000);
}

interface FollowupTagInfo {
  texto: string;
  classe: string;
  pendenteAtrasado: boolean;
  pendenteHoje: boolean;
}

function followupTagInfo(
  agendadoPara: Date,
  concluidoEm: Date | null,
  now: Date,
): FollowupTagInfo {
  if (concluidoEm) {
    return {
      texto: `Concluído em ${formatDateBR(concluidoEm)}`,
      classe: "bg-lima-50 text-lima-700 ring-lima-100",
      pendenteAtrasado: false,
      pendenteHoje: false,
    };
  }
  const diffDias = diasDeDiferenca(agendadoPara, now);
  const diffMs = agendadoPara.getTime() - now.getTime();
  if (diffDias < 0) {
    const abs = Math.abs(diffDias);
    return {
      texto:
        abs === 1
          ? "Atrasado · há 1 dia"
          : `Atrasado · há ${abs} dias`,
      classe: "bg-red-50 text-red-700 ring-red-100",
      pendenteAtrasado: true,
      pendenteHoje: false,
    };
  }
  if (diffDias === 0) {
    return {
      texto: "Hoje",
      classe: "bg-amber-50 text-amber-700 ring-amber-100",
      pendenteAtrasado: false,
      pendenteHoje: true,
    };
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    const horas = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
    return {
      texto: horas === 1 ? "Em 1 h" : `Em ${horas} h`,
      classe: "bg-amber-50 text-amber-700 ring-amber-100",
      pendenteAtrasado: false,
      pendenteHoje: false,
    };
  }
  return {
    texto: diffDias === 1 ? "Em 1 dia" : `Em ${diffDias} dias`,
    classe:
      diffDias <= 2
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-slate-200",
    pendenteAtrasado: false,
    pendenteHoje: false,
  };
}

interface ItemMenuProps {
  atividadeId: string;
  podeExcluir: boolean;
  onExcluir: () => void;
}

function ItemMenu({ atividadeId: _aid, podeExcluir, onExcluir }: ItemMenuProps) {
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

  if (!podeExcluir) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais ações"
        title="Mais ações"
        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
      >
        <MoreHorizontal size={14} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-line bg-white shadow-pop"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExcluir();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={12} />
            Excluir
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AtividadeLeadFeed({
  atividades,
  currentUserId,
  isAdmin,
}: AtividadeLeadFeedProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const now = new Date();

  if (atividades.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma atividade registrada ainda. Comece registrando uma ligação ou
        agendando um follow-up.
      </p>
    );
  }

  function handleConcluir(atividadeId: string) {
    startTransition(async () => {
      const result = await marcarFollowupConcluido(atividadeId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up concluído");
      router.refresh();
    });
  }

  async function handleExcluir(atividadeId: string) {
    const ok = await confirm({
      title: "Excluir atividade",
      message:
        "A atividade será removida da timeline. Eventos automáticos não podem ser apagados.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await excluirAtividade(atividadeId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Atividade excluída");
      router.refresh();
    });
  }

  return (
    <ol className="relative flex flex-col gap-4">
      <span
        aria-hidden
        className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200"
      />
      {atividades.map((ativ, i) => {
        // Fallback defensivo: se o enum crescer no DB sem atualizar este mapa,
        // a UI degrada graciosamente em vez de quebrar com `undefined`.
        const spec = ICON_BY_TIPO[ativ.tipo] ?? ICON_BY_TIPO.nota;
        const { Icon, color, bg, ring } = spec;
        const autor = primeiroNome(ativ.autor.nome);
        const verbo = VERBO_BY_TIPO[ativ.tipo] ?? "registrou um evento";
        const podeExcluir =
          !TIPOS_AUTOMATICOS.has(ativ.tipo) &&
          (isAdmin || ativ.autor.id === currentUserId);

        const isFollowupAgendado = ativ.tipo === "followup_agendado";
        const tagInfo =
          isFollowupAgendado && ativ.agendadoPara
            ? followupTagInfo(ativ.agendadoPara, ativ.concluidoEm, now)
            : null;

        const destaqueBorda =
          isFollowupAgendado &&
          ativ.concluidoEm === null &&
          tagInfo
            ? tagInfo.pendenteAtrasado
              ? "border-l-2 border-red-300 bg-red-50/30"
              : tagInfo.pendenteHoje
                ? "border-l-2 border-amber-300 bg-amber-50/30"
                : ""
            : "";

        const animDelay = `${Math.min(i, 9) * 30}ms`;

        return (
          <li
            key={ativ.id}
            className={`animate-fade-in-up relative flex items-start gap-3 rounded-lg pl-0 ${
              destaqueBorda ? `${destaqueBorda} -ml-2 pl-2 py-1.5 pr-2` : ""
            }`}
            style={{ animationDelay: animDelay }}
          >
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${bg} ${ring}`}
            >
              <Icon size={14} className={color} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-ink">
                  <span className="font-medium">{autor}</span>{" "}
                  {verbo ? (
                    <span className="text-slate-700">{verbo}</span>
                  ) : null}
                  <span className="ml-1 text-xs text-slate-500">
                    · {formatRelative(ativ.createdAt)}
                  </span>
                </p>
                <ItemMenu
                  atividadeId={ativ.id}
                  podeExcluir={podeExcluir}
                  onExcluir={() => handleExcluir(ativ.id)}
                />
              </div>
              {ativ.descricao ? (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                  {ativ.descricao}
                </p>
              ) : null}

              {isFollowupAgendado && ativ.agendadoPara && tagInfo ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tagInfo.classe}`}
                  >
                    {tagInfo.texto}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Agendado para {formatDateBR(ativ.agendadoPara)}{" "}
                    {ativ.agendadoPara
                      .toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                  {!ativ.concluidoEm ? (
                    <button
                      type="button"
                      onClick={() => handleConcluir(ativ.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:border-lima-200 hover:bg-lima-50 hover:text-lima-700"
                    >
                      <CheckCircle2 size={12} />
                      Marcar como concluído
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
