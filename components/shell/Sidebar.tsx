"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
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

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vagas/nova", label: "Nova vaga", icon: PlusCircle, exact: true },
  { href: "/admin", label: "Administração", icon: Settings, adminOnly: true },
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
    return pathname.startsWith(item.href);
  }

  const items = NAV.filter((i) => !i.adminOnly || role === "admin");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm transition-[width] duration-300 ease-smooth md:flex md:flex-col",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-slate-200 px-4",
          collapsed ? "h-16 justify-center px-0" : "h-16",
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-royal text-sm font-bold text-white shadow-pop">
            C
          </span>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight">
              CapTalento <span className="text-royal">RH</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
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

        <div
          className={cn(
            "pt-4",
            collapsed && "flex flex-col items-center",
          )}
        >
          <div
            className={cn(
              "mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400",
              collapsed && "hidden",
            )}
          >
            Acesso rápido
          </div>
          <Link
            href="/dashboard?filter=ativas"
            className={cn(
              "nav-item text-xs",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Vagas ativas" : undefined}
          >
            <Briefcase size={16} className="shrink-0" />
            {!collapsed && <span>Vagas ativas</span>}
          </Link>
          {role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "nav-item text-xs",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? "Usuários" : undefined}
            >
              <Users size={16} className="shrink-0" />
              {!collapsed && <span>Usuários</span>}
            </Link>
          )}
        </div>
      </nav>

      {/* Colapsar */}
      <div className="border-t border-slate-200 p-3">
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
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>

      {!mounted && <span aria-hidden className="sr-only" />}
    </aside>
  );
}
