import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-royal-soft text-royal-600 ring-1 ring-inset ring-royal-100">
          <Icon size={22} />
        </span>
      )}
      <div className="max-w-md">
        <h2 className="text-h3 text-ink">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500 text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
