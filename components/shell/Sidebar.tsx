"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  UserSearch,
  Building2,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "recruiter" | "admin";
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Trabalho",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/vagas/nova",
        label: "Nova vaga",
        icon: PlusCircle,
        exact: true,
      },
    ],
  },
  {
    title: "Pessoas",
    items: [
      { href: "/talentos", label: "Talentos", icon: UserSearch },
      { href: "/clientes", label: "Clientes", icon: Building2 },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        href: "/admin",
        label: "Administração",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];

const STORAGE_KEY = "captalento.sidebar.collapsed";

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-line/70 bg-white transition-[width] duration-300 ease-smooth md:flex md:flex-col",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Header logo */}
      <div
        className={cn(
          "flex items-center border-b border-line/70 px-4",
          collapsed ? "h-16 justify-center px-0" : "h-16",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-royal text-sm font-bold text-white shadow-pop">
            C
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lima ring-2 ring-white" />
          </span>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight">
              CapTalento <span className="text-royal">RH</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav agrupada */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {SECTIONS.map((section) => {
          const items = section.items.filter(
            (i) => !i.adminOnly || role === "admin",
          );
          if (items.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <div className="mb-2 px-3 text-eyebrow uppercase text-slate-400">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "nav-item",
                        active && "nav-item-active",
                        collapsed && "justify-center px-2",
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Dica de atalho — aparece quando expandida */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl border border-line/70 bg-gradient-royal-soft p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-royal-700">
            <Sparkles size={12} />
            Dica
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Aperte{" "}
            <kbd className="kbd">Ctrl</kbd>{" "}
            <kbd className="kbd">K</kbd> pra buscar qualquer coisa.
          </p>
        </div>
      )}

      {/* Colapsar */}
      <div className="border-t border-line/70 px-3 py-3">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "nav-item w-full text-slate-400",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? (
            <ChevronsRight size={18} />
          ) : (
            <>
              <ChevronsLeft size={18} />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </div>

      {!mounted && <span aria-hidden className="sr-only" />}
    </aside>
  );
}
