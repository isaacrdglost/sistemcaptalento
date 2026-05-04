"use client";

import { useEffect, useState } from "react";
import { LeadViewToggle } from "@/components/LeadViewToggle";
import { LeadKanban } from "@/components/LeadKanban";
import { GanharLeadDialog } from "@/components/GanharLeadDialog";
import { PerderLeadDialog } from "@/components/PerderLeadDialog";
import type { LeadRow } from "@/components/LeadList";

const STORAGE_KEY = "captalento.lead.view";

interface LeadsViewSwitcherProps {
  leads: LeadRow[];
  currentUserId: string;
  isAdmin: boolean;
  /** Renderiza a versão lista (server-rendered ou client). */
  listSlot: React.ReactNode;
  /** Quando false, esconde o toggle e força "lista" (ex: tabs ganhos/perdidos). */
  toggleEnabled?: boolean;
}

export function LeadsViewSwitcher({
  leads,
  currentUserId,
  isAdmin,
  listSlot,
  toggleEnabled = true,
}: LeadsViewSwitcherProps) {
  // Default no SSR: kanban (evita mismatch de hydration; é a vista preferida)
  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [hydrated, setHydrated] = useState(false);
  const [ganharLeadId, setGanharLeadId] = useState<string | null>(null);
  const [perderLeadId, setPerderLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "kanban" || stored === "lista") {
        setView(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function handleChange(next: "lista" | "kanban") {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const leadGanhar = ganharLeadId
    ? leads.find((l) => l.id === ganharLeadId)
    : null;
  const leadPerder = perderLeadId
    ? leads.find((l) => l.id === perderLeadId)
    : null;

  // Quando toggle desabilitado, sempre lista
  const viewEfetivo: "lista" | "kanban" = toggleEnabled ? view : "lista";

  return (
    <div className="space-y-4">
      {toggleEnabled ? (
        <div className="flex items-center justify-end">
          <LeadViewToggle value={view} onChange={handleChange} />
        </div>
      ) : null}

      {viewEfetivo === "kanban" && hydrated ? (
        <LeadKanban
          leads={leads}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onAbrirGanho={(id) => setGanharLeadId(id)}
          onAbrirPerdido={(id) => setPerderLeadId(id)}
        />
      ) : (
        listSlot
      )}

      <GanharLeadDialog
        leadId={ganharLeadId}
        leadRazaoSocial={leadGanhar?.razaoSocial}
        onClose={() => setGanharLeadId(null)}
      />
      <PerderLeadDialog
        leadId={perderLeadId}
        leadRazaoSocial={leadPerder?.razaoSocial}
        onClose={() => setPerderLeadId(null)}
      />
    </div>
  );
}
