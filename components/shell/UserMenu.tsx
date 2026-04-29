"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

interface UserMenuProps {
  name: string;
  email: string;
  role: "recruiter" | "admin";
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const primeiroNome = name.split(" ")[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 shadow-xs transition hover:border-line-strong hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-200"
      >
        <Avatar nome={name} size="sm" gradient />
        <span className="hidden text-sm font-medium text-ink sm:inline">
          {primeiroNome}
        </span>
        <ChevronDown
          size={14}
          className="text-slate-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right animate-scale-in rounded-2xl border border-line/70 bg-white p-2 shadow-lg">
          {/* Cabeçalho do menu */}
          <div className="flex items-center gap-3 rounded-xl bg-gradient-royal-soft p-3">
            <Avatar nome={name} size="md" gradient />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">
                {name}
              </div>
              <div className="truncate text-xs text-slate-500">{email}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-royal-700 ring-1 ring-inset ring-royal-100">
                <span className="dot bg-lima animate-pulse-soft" />
                {role === "admin" ? "Admin" : "Recrutadora"}
              </div>
            </div>
          </div>

          <div className="my-1 h-px bg-line/70" />

          <Link
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-ink"
          >
            <Settings size={14} />
            Configurações
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
