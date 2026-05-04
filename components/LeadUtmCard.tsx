import { Activity } from "lucide-react";
import type { Lead } from "@prisma/client";

interface LeadUtmCardProps {
  lead: Lead;
}

export function LeadUtmCard({ lead }: LeadUtmCardProps) {
  const items: { label: string; value: string }[] = [];
  if (lead.utmSource) items.push({ label: "utm_source", value: lead.utmSource });
  if (lead.utmMedium) items.push({ label: "utm_medium", value: lead.utmMedium });
  if (lead.utmCampaign)
    items.push({ label: "utm_campaign", value: lead.utmCampaign });

  if (items.length === 0) return null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={14} className="text-slate-400" />
        <div className="section-label">Tracking de origem</div>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5"
          >
            <span className="font-mono text-[10px] uppercase text-slate-500">
              {it.label}
            </span>
            <span className="font-mono text-xs text-ink truncate max-w-[60%]">
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
