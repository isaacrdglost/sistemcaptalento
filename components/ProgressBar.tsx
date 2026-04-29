interface ProgressBarProps {
  pct: number;
  label?: string;
  /** quando true, a barra é colorida de vermelho para sinalizar atraso */
  atrasada?: boolean;
}

export function ProgressBar({ pct, label, atrasada = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const fillClass = atrasada
    ? "bg-red-500"
    : clamped >= 100
      ? "bg-lima"
      : "bg-royal";
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{label}</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
        <div
          className={`h-full rounded-full ${fillClass} transition-[width] duration-500 ease-smooth`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
