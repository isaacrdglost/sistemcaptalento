"use client";

import { useState } from "react";
import { Bell, MessageSquarePlus } from "lucide-react";
import type { TipoAtividadeLead } from "@prisma/client";
import { AtividadeLeadFeed } from "@/components/AtividadeLeadFeed";
import { RegistrarAtividadeModal } from "@/components/RegistrarAtividadeModal";
import { AgendarFollowupModal } from "@/components/AgendarFollowupModal";

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

interface LeadAtividadesPanelProps {
  leadId: string;
  atividades: AtividadeItem[];
  currentUserId: string;
  isAdmin: boolean;
  podeAgir: boolean;
}

export function LeadAtividadesPanel({
  leadId,
  atividades,
  currentUserId,
  isAdmin,
  podeAgir,
}: LeadAtividadesPanelProps) {
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false);

  return (
    <div className="space-y-4">
      {podeAgir ? (
        <section className="card p-5">
          <div className="mb-3">
            <div className="section-label mb-1">Ações rápidas</div>
            <h3 className="text-sm font-semibold text-ink">
              Avance este lead
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setRegistrarOpen(true)}
              className="group flex items-center gap-3 rounded-xl border border-line/70 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-royal-200 hover:bg-royal-50/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600 transition group-hover:bg-royal-100">
                <MessageSquarePlus size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Registrar atividade
                </span>
                <span className="block text-xs text-slate-500">
                  Ligação, e-mail, reunião, WhatsApp ou nota.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAgendarOpen(true)}
              className="group flex items-center gap-3 rounded-xl border border-line/70 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 transition group-hover:bg-amber-100">
                <Bell size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Agendar follow-up
                </span>
                <span className="block text-xs text-slate-500">
                  Marque um lembrete pra não perder o lead.
                </span>
              </span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="card p-5">
        <div className="mb-4">
          <div className="section-label mb-1">Atividade</div>
          <h3 className="text-h3 text-ink">Timeline</h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto pr-1">
          <AtividadeLeadFeed
            atividades={atividades}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      </section>

      <RegistrarAtividadeModal
        leadId={leadId}
        open={registrarOpen}
        onClose={() => setRegistrarOpen(false)}
      />
      <AgendarFollowupModal
        leadId={leadId}
        open={agendarOpen}
        onClose={() => setAgendarOpen(false)}
      />
    </div>
  );
}
