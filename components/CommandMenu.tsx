"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Command } from "cmdk";
import {
  Search,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Briefcase,
  Building2,
  Target,
  Trophy,
  User,
  UserSearch,
} from "lucide-react";
import { useCommandMenu } from "./CommandMenuProvider";
import { fluxoLabel } from "@/lib/flows";
import { descricaoEstagioLead } from "@/lib/activity-lead";
import type { EstagioLead, Fluxo, StatusCandidato } from "@prisma/client";

interface SearchVaga {
  id: string;
  titulo: string;
  cliente: string;
  fluxo: Fluxo;
  encerrada: boolean;
}

interface SearchCandidato {
  id: string;
  vagaId: string;
  nome: string;
  status: StatusCandidato;
  vagaTitulo: string;
}

interface SearchCliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  vagasCount: number;
}

interface SearchTalento {
  id: string;
  nome: string;
  email: string | null;
  senioridade: string | null;
  area: string | null;
}

interface SearchLead {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  estagio: EstagioLead;
  responsavelNome: string | null;
}

interface SearchResponse {
  vagas: SearchVaga[];
  candidatos: SearchCandidato[];
  clientes: SearchCliente[];
  talentos: SearchTalento[];
  leads: SearchLead[];
}

const SENIORIDADE_LABEL_SHORT: Record<string, string> = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  lideranca: "Liderança",
};

const DEBOUNCE_MS = 150;

export function CommandMenu() {
  const { isOpen, close } = useCommandMenu();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "admin";
  const isComercial = role === "comercial";
  const isOperacional = role === "recruiter" || role === "admin";

  const [query, setQuery] = useState("");
  const [vagas, setVagas] = useState<SearchVaga[]>([]);
  const [candidatos, setCandidatos] = useState<SearchCandidato[]>([]);
  const [clientes, setClientes] = useState<SearchCliente[]>([]);
  const [talentos, setTalentos] = useState<SearchTalento[]>([]);
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [loading, setLoading] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Reset da query quando fecha
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Ouvinte local Escape (redundante, mas garante fechamento mesmo quando
  // cmdk delega foco em estado incomum)
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Fetch com debounce
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, credentials: "same-origin" },
        );
        if (!res.ok) {
          if (!controller.signal.aborted) {
            setVagas([]);
            setCandidatos([]);
            setClientes([]);
            setTalentos([]);
            setLeads([]);
          }
          return;
        }
        const data = (await res.json()) as SearchResponse;
        if (!controller.signal.aborted) {
          setVagas(data.vagas ?? []);
          setCandidatos(data.candidatos ?? []);
          setClientes(data.clientes ?? []);
          setTalentos(data.talentos ?? []);
          setLeads(data.leads ?? []);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setVagas([]);
          setCandidatos([]);
          setClientes([]);
          setTalentos([]);
          setLeads([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) close();
  }

  function go(path: string) {
    close();
    router.push(path);
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <Command
        label="Paleta de comandos"
        shouldFilter={false}
        loop
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop animate-scale-in"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search
            size={16}
            className={
              loading
                ? "shrink-0 animate-spin text-royal"
                : "shrink-0 text-slate-400"
            }
          />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder="Buscar vagas, candidatos, ações…"
            className="flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
          />
          <kbd className="kbd">ESC</kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum resultado
          </Command.Empty>

          <Command.Group
            heading="Navegação"
            className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
          >
            {isOperacional && (
              <NavItem
                value="nav-dashboard"
                label="Dashboard"
                icon={<LayoutDashboard size={16} className="text-slate-500" />}
                onSelect={() => go("/dashboard")}
              />
            )}
            {isOperacional && (
              <NavItem
                value="nav-nova-vaga"
                label="Nova vaga"
                icon={<PlusCircle size={16} className="text-slate-500" />}
                onSelect={() => go("/vagas/nova")}
              />
            )}
            {(isComercial || isAdmin) && (
              <NavItem
                value="nav-comercial"
                label="Painel comercial"
                icon={<Briefcase size={16} className="text-slate-500" />}
                onSelect={() => go("/comercial")}
              />
            )}
            {(isComercial || isAdmin) && (
              <NavItem
                value="nav-leads"
                label="Pipeline de leads"
                icon={<Target size={16} className="text-slate-500" />}
                onSelect={() => go("/comercial/leads")}
              />
            )}
            {(isComercial || isAdmin) && (
              <NavItem
                value="nav-leads-novo"
                label="Novo lead"
                icon={<PlusCircle size={16} className="text-slate-500" />}
                onSelect={() => go("/comercial/leads/novo")}
              />
            )}
            {(isComercial || isAdmin) && (
              <NavItem
                value="nav-metas"
                label="Metas"
                icon={<Trophy size={16} className="text-slate-500" />}
                onSelect={() => go("/comercial/metas")}
              />
            )}
            {isOperacional && (
              <NavItem
                value="nav-talentos"
                label="Talentos"
                icon={<UserSearch size={16} className="text-slate-500" />}
                onSelect={() => go("/talentos")}
              />
            )}
            <NavItem
              value="nav-clientes"
              label="Clientes"
              icon={<Building2 size={16} className="text-slate-500" />}
              onSelect={() => go("/clientes")}
            />
            {isAdmin && (
              <NavItem
                value="nav-admin"
                label="Administração"
                icon={<Settings size={16} className="text-slate-500" />}
                onSelect={() => go("/admin")}
              />
            )}
          </Command.Group>

          {vagas.length > 0 && (
            <>
              <Command.Separator className="my-1 h-px bg-slate-100" />
              <Command.Group
                heading="Vagas"
                className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {vagas.map((v) => (
                  <Command.Item
                    key={v.id}
                    value={`vaga-${v.id}-${v.titulo}-${v.cliente}`}
                    onSelect={() => go(`/vagas/${v.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
                  >
                    <Briefcase size={16} className="shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{v.titulo}</div>
                      <div className="truncate text-xs text-slate-500">
                        {v.cliente}
                      </div>
                    </div>
                    <span
                      className={
                        v.fluxo === "rapido" ? "badge-lima" : "badge-royal"
                      }
                    >
                      {fluxoLabel(v.fluxo)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}

          {clientes.length > 0 && (
            <>
              <Command.Separator className="my-1 h-px bg-slate-100" />
              <Command.Group
                heading="Clientes"
                className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {clientes.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`cli-${c.id}-${c.razaoSocial}`}
                    onSelect={() => go(`/clientes/${c.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
                  >
                    <Building2
                      size={16}
                      className="shrink-0 text-slate-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.razaoSocial}
                      </div>
                      {c.nomeFantasia && (
                        <div className="truncate text-xs text-slate-500">
                          {c.nomeFantasia}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {c.vagasCount} vaga{c.vagasCount === 1 ? "" : "s"}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}

          {talentos.length > 0 && (
            <>
              <Command.Separator className="my-1 h-px bg-slate-100" />
              <Command.Group
                heading="Talentos"
                className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {talentos.map((t) => {
                  const metaParts: string[] = [];
                  if (t.senioridade) {
                    metaParts.push(
                      SENIORIDADE_LABEL_SHORT[t.senioridade] ?? t.senioridade,
                    );
                  }
                  if (t.area) metaParts.push(t.area);
                  const meta = metaParts.join(" • ");
                  return (
                    <Command.Item
                      key={t.id}
                      value={`tal-${t.id}-${t.nome}-${t.area ?? ""}`}
                      onSelect={() => go(`/talentos/${t.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
                    >
                      <UserSearch
                        size={16}
                        className="shrink-0 text-slate-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.nome}</div>
                        {meta && (
                          <div className="truncate text-xs text-slate-500">
                            {meta}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </>
          )}

          {leads.length > 0 && (
            <>
              <Command.Separator className="my-1 h-px bg-slate-100" />
              <Command.Group
                heading="Leads"
                className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {leads.map((l) => (
                  <Command.Item
                    key={l.id}
                    value={`lead-${l.id}-${l.razaoSocial}`}
                    onSelect={() => go(`/comercial/leads/${l.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
                  >
                    <Target size={16} className="shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {l.razaoSocial}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {l.nomeFantasia ?? l.responsavelNome ?? "—"}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {descricaoEstagioLead(l.estagio)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}

          {candidatos.length > 0 && (
            <>
              <Command.Separator className="my-1 h-px bg-slate-100" />
              <Command.Group
                heading="Candidatos"
                className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {candidatos.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`cand-${c.id}-${c.nome}-${c.vagaTitulo}`}
                    onSelect={() => go(`/vagas/${c.vagaId}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
                  >
                    <User size={16} className="shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.nome}</div>
                      <div className="truncate text-xs text-slate-500">
                        {c.vagaTitulo}
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

interface NavItemProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

function NavItem({ value, label, icon, onSelect }: NavItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition data-[selected=true]:bg-royal-50 data-[selected=true]:text-royal-700"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate font-medium">{label}</span>
    </Command.Item>
  );
}
