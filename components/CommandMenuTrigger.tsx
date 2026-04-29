"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "./CommandMenuProvider";

export function CommandMenuTrigger() {
  const { open } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={open}
      className="hidden h-9 items-center gap-2.5 rounded-xl border border-line bg-slate-50/50 px-3 text-sm text-slate-500 shadow-xs transition hover:border-line-strong hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-200 md:inline-flex md:w-72 lg:w-80"
      aria-label="Buscar (Ctrl+K)"
    >
      <Search size={14} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
        Buscar vagas, talentos…
      </span>
      <span className="hidden shrink-0 items-center gap-1 lg:flex">
        <kbd className="kbd">Ctrl</kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}
