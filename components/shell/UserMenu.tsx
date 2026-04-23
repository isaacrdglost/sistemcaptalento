"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

interface UserMenuProps {
  name: string;
  email: string;
  role: "recruiter" | "admin";
}

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 py-1 pr-3 shadow-xs transition hover:shadow-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-200"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-royal text-[11px] font-bold text-white">
          {iniciais(name)}
        </span>
        <span className="hidden text-xs font-medium text-ink sm:inline">
          {name.split(" ")[0]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right animate-scale-in rounded-xl border border-slate-200 bg-white p-2 shadow-raised">
          <div className="flex items-center gap-3 rounded-lg p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-royal text-sm font-bold text-white">
              {iniciais(name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">
                {name}
              </div>
              <div className="truncate text-xs text-slate-500">{email}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-royal-700">
                {role === "admin" ? "Admin" : "Recrutadora"}
              </div>
            </div>
          </div>

          <div className="my-1 h-px bg-slate-100" />

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
