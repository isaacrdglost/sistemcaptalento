import type { ProtocoloStatus, MotivoSaida } from "@prisma/client";

export const PROTOCOLO_STATUS_LABEL: Record<ProtocoloStatus, string> = {
  aberto: "Aberto · em triagem",
  aguardando_cliente: "Aguardando cliente",
  ativada: "Garantia ativa",
  reposto: "Reposto",
  encerrado: "Encerrado",
};

export const PROTOCOLO_STATUS_TONE: Record<
  ProtocoloStatus,
  { bg: string; text: string; ring: string }
> = {
  aberto: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
  },
  aguardando_cliente: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  ativada: {
    bg: "bg-lima-100",
    text: "text-lima-700",
    ring: "ring-lima-200",
  },
  reposto: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  encerrado: {
    bg: "bg-red-100",
    text: "text-red-700",
    ring: "ring-red-200",
  },
};

export const MOTIVO_SAIDA_LABEL: Record<MotivoSaida, string> = {
  pedido_cliente: "Pedido do cliente",
  pedido_candidato: "Pedido do candidato",
  acordo_mutuo: "Acordo mútuo",
  inadequacao_tecnica: "Inadequação técnica",
  inadequacao_comportamental: "Inadequação comportamental",
  reestruturacao_cliente: "Reestruturação do cliente",
  mudanca_escopo: "Mudança de escopo",
  falha_onboarding_cliente: "Falha de onboarding do cliente",
  outro: "Outro",
};

export const VIA_CONFIRMACAO_LABEL: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  reuniao: "Reunião",
  outro: "Outro",
};
