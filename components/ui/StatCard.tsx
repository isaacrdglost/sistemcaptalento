import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  /** Tonalidade do destaque do card (a moldura colorida do ícone). */
  tone?: "royal" | "lima" | "amber" | "red" | "slate";
  /** Densidade do card. `sm` é mais compacto (usado em strips). */
  size?: "sm" | "md";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  royal: "bg-royal-50 text-royal-600 ring-royal-100",
  lima: "bg-lima-50 text-lima-700 ring-lima-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

const TREND_CLASSES = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-slate-500",
};

const TREND_ARROW = {
  up: "↑",
  down: "↓",
  neutral: "—",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = "royal",
  size = "md",
  className,
}: StatCardProps) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "stat-card group",
        compact && "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="stat-label">{label}</div>
          <div
            className={cn(
              "mt-1 stat-value",
              compact && "text-xl",
            )}
          >
            {value}
          </div>
          {(hint || trend) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    TREND_CLASSES[trend.direction],
                  )}
                >
                  {TREND_ARROW[trend.direction]} {trend.value}
                </span>
              )}
              {hint && <span className="text-slate-500">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition group-hover:scale-105",
              compact ? "h-8 w-8" : "h-9 w-9",
              TONE_CLASSES[tone],
            )}
          >
            <Icon size={compact ? 14 : 16} />
          </span>
        )}
      </div>
    </div>
  );
}
