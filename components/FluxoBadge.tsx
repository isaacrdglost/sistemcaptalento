import { fluxoLabel } from "@/lib/flows";
import type { Fluxo } from "@prisma/client";

interface FluxoBadgeProps {
  fluxo: Fluxo;
}

export function FluxoBadge({ fluxo }: FluxoBadgeProps) {
  const className = fluxo === "rapido" ? "badge-lima" : "badge-royal";
  return <span className={className}>{fluxoLabel(fluxo)}</span>;
}
