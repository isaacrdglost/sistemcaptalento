import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * Tamanho do mark em pixels. Default 32 — bom pra header de sidebar.
   * Use 48-64 pra hero do login, 24 pra contextos compactos.
   */
  size?: number;
  /** Variante visual. "brand" = colorida (azul + lima), "muted" = esmaecida. */
  variant?: "brand" | "muted";
  /** Quando true, exibe o nome "CapTalento RH" ao lado do mark. */
  withWordmark?: boolean;
  className?: string;
}

const SRC_BY_VARIANT: Record<NonNullable<LogoProps["variant"]>, string> = {
  brand: "/logo-dark.png",
  muted: "/logo-light.png",
};

/**
 * Logo da CapTalento RH. Marca = alvo + flecha + miolo lima.
 *
 * Renderiza via next/image pra otimização automática (responsive, lazy,
 * cache). Tamanho do mark é controlado pelo prop `size`. Quando
 * `withWordmark` é true, exibe o nome ao lado mantendo proporção
 * harmônica entre mark e tipografia.
 */
export function Logo({
  size = 32,
  variant = "brand",
  withWordmark = false,
  className,
}: LogoProps) {
  const src = SRC_BY_VARIANT[variant];
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="CapTalento RH"
    >
      <Image
        src={src}
        alt="CapTalento RH"
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {withWordmark && (
        <span
          className="font-bold tracking-tight text-ink"
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          CapTalento <span className="text-royal">RH</span>
        </span>
      )}
    </span>
  );
}
