import { cn } from "@/lib/utils";

interface AvatarProps {
  nome: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Quando true, usa o gradient azul royal premium em vez de bg sólido. */
  gradient?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Gera uma cor estável baseada no nome — assim avatares sem gradient
 * têm tonalidades distintas mas determinísticas.
 */
function corDoNome(nome: string): string {
  const palette = [
    "bg-royal-100 text-royal-700",
    "bg-lima-100 text-lima-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({
  nome,
  size = "md",
  gradient = false,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-inset ring-white/40",
        SIZE_CLASSES[size],
        gradient
          ? "bg-gradient-royal text-white shadow-pop"
          : corDoNome(nome),
        className,
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
