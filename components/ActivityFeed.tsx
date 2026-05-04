import type { TipoAtividade } from "@prisma/client";
import {
  CalendarCheck,
  CheckCircle2,
  Edit2,
  FileText,
  Lock,
  Phone,
  Play,
  RotateCcw,
  ShieldCheck,
  StickyNote,
  Unlock,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateBR, formatRelative } from "@/lib/business-days";

interface ActivityFeedProps {
  vagaId: string;
  limit?: number;
}

interface IconSpec {
  Icon: LucideIcon;
  color: string;
  bg: string;
  ring: string;
}

const ICON_BY_TIPO: Record<TipoAtividade, IconSpec> = {
  vaga_criada: {
    Icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  vaga_publicada: {
    Icon: Play,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  vaga_encerrada: {
    Icon: Lock,
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  vaga_reaberta: {
    Icon: Unlock,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  vaga_editada: {
    Icon: Edit2,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  triagem_confirmada: {
    Icon: CheckCircle2,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  entrevistas_confirmadas: {
    Icon: CheckCircle2,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  shortlist_interna_registrada: {
    Icon: FileText,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  shortlist_entregue: {
    Icon: CheckCircle2,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  contato_cliente_registrado: {
    Icon: Phone,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  marco_desfeito: {
    Icon: RotateCcw,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  candidato_adicionado: {
    Icon: UserPlus,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  candidato_status_alterado: {
    Icon: Users,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  candidato_removido: {
    Icon: UserMinus,
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  candidato_editado: {
    Icon: Edit2,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  nota_adicionada: {
    Icon: StickyNote,
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  candidatos_importados_agenda: {
    Icon: CalendarCheck,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  analise_ficha_registrada: {
    Icon: ShieldCheck,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  talento_vinculado: {
    Icon: UserSearch,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  candidato_contratado: {
    Icon: ShieldCheck,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  garantia_finalizada_ok: {
    Icon: CheckCircle2,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  garantia_acionada: {
    Icon: ShieldCheck,
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  garantia_triada: {
    Icon: CheckCircle2,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  reposicao_aberta: {
    Icon: Play,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
  reposicao_concluida: {
    Icon: CheckCircle2,
    color: "text-lima-700",
    bg: "bg-lima-50",
    ring: "ring-lima-200",
  },
  checkin_pos_contratacao: {
    Icon: CalendarCheck,
    color: "text-royal-600",
    bg: "bg-royal-50",
    ring: "ring-royal-200",
  },
};

function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return "Alguém";
  const parte = nome.trim().split(/\s+/)[0];
  return parte || "Alguém";
}

function formatAbsolute(date: Date): string {
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDateBR(date)} às ${hora}`;
}

export async function ActivityFeed({ vagaId, limit = 30 }: ActivityFeedProps) {
  const atividades = await prisma.atividade.findMany({
    where: { vagaId },
    include: { autor: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (atividades.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma atividade registrada ainda.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-4 animate-fade-in-up">
      <span
        aria-hidden
        className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200"
      />
      {atividades.map((ativ) => {
        const spec = ICON_BY_TIPO[ativ.tipo];
        const { Icon, color, bg, ring } = spec;
        const autor = primeiroNome(ativ.autor?.nome);
        const absoluto = formatAbsolute(new Date(ativ.createdAt));
        return (
          <li key={ativ.id} className="relative flex items-start gap-3 pl-0">
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${bg} ${ring}`}
            >
              <Icon size={14} className={color} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-ink">
                <span className="font-medium">{autor}</span>{" "}
                <span className="text-slate-700">{ativ.descricao}</span>
              </p>
              <p
                className="mt-0.5 text-xs text-slate-500"
                title={absoluto}
              >
                {formatRelative(ativ.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
