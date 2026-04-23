"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "./CommandMenuProvider";

export function CommandMenuTrigger() {
  const { open } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={open}
      className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 shadow-xs transition hover:border-slate-300 hover:bg-white md:flex md:w-72"
      aria-label="Buscar (Ctrl+K)"
    >
      <Search size={14} className="text-slate-400" />
      <span className="flex-1 text-left">Buscar vagas, candidatos…</span>
      <span className="flex items-center gap-1">
        <kbd className="kbd">Ctrl</kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}
