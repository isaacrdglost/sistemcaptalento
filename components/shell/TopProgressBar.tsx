"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barra fina animada no topo que aparece em cada navegação interna.
 * Dispara no clique em qualquer <a> com href interno e some quando o
 * pathname (ou os searchParams) muda — ou após 5s como fallback.
 *
 * Resolve a sensação de "tela congelada" típica do Next.js App Router,
 * onde a UI fica sem feedback entre o clique e a renderização do RSC.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click em qualquer link interno → ativa a barra
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignora se o usuário modificou o clique (abrir em nova aba, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      const target = e.target as Element | null;
      const link = target?.closest?.("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (link.getAttribute("target") === "_blank") return;
      // External
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Mesma URL exata — provavelmente refresh manual, skip
        if (url.pathname === pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }
      setActive(true);
      if (safetyRef.current) clearTimeout(safetyRef.current);
      safetyRef.current = setTimeout(() => setActive(false), 5000);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  // Pathname/searchParams mudou → fecha a barra
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!active) return null;

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[300] h-0.5 overflow-hidden bg-transparent pointer-events-none">
        <div
          className="h-full bg-royal"
          style={{ animation: "topbar-progress 1.4s ease-in-out infinite" }}
        />
      </div>
      <style>{`
        @keyframes topbar-progress {
          0%   { transform: translateX(-100%); width: 30%; }
          50%  { transform: translateX(50%);  width: 60%; }
          100% { transform: translateX(200%); width: 30%; }
        }
      `}</style>
    </>
  );
}
