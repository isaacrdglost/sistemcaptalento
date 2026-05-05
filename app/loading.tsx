/**
 * Skeleton mostrado automaticamente pelo Next.js durante a renderização
 * server-side da próxima rota. Aparece IMEDIATAMENTE quando o usuário
 * clica em um Link, evitando a sensação de "tela congelada".
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[1] flex flex-col">
      {/* Barra fina no topo, indicando atividade */}
      <div className="h-0.5 w-full overflow-hidden bg-slate-100">
        <div
          className="h-full bg-royal"
          style={{ animation: "topbar-progress 1.4s ease-in-out infinite" }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-royal" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Carregando…
          </span>
        </div>
      </div>

      <style>{`
        @keyframes topbar-progress {
          0%   { transform: translateX(-100%); width: 30%; }
          50%  { transform: translateX(50%);  width: 60%; }
          100% { transform: translateX(200%); width: 30%; }
        }
      `}</style>
    </div>
  );
}
