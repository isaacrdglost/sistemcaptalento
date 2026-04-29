"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "./CommandMenuProvider";

export function CommandMenuTrigger() {
  const { open } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={open}
      className="hidden items-center gap-3 rounded-xl border border-line bg-slate-50/50 px-3 py-2 text-sm text-slate-500 shadow-xs transition hover:border-line-strong hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-200 md:flex md:w-80"
      aria-label="Buscar (Ctrl+K)"
    >
      <Search size={14} className="text-slate-400" />
      <span className="flex-1 text-left">Buscar vagas, talentos, clientes…</span>
      <span className="flex items-center gap-1">
        <kbd className="kbd">Ctrl</kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}
