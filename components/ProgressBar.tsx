interface ProgressBarProps {
  pct: number;
  label?: string;
  /** quando true, a barra é colorida de vermelho para sinalizar atraso */
  atrasada?: boolean;
}

export function ProgressBar({ pct, label, atrasada = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const fillClass = atrasada ? "bg-red-500" : "bg-royal";
  return (
    <div>
      {label ? (
        <div className="mb-1 text-xs text-slate-500">{label}</div>
      ) : null}
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${fillClass} transition-[width]`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
