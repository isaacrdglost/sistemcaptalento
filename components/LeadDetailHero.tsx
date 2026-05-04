"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageCircle,
  X,
} from "lucide-react";
import type { Lead, MensagemTemplate } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { descricaoEstagioLead } from "@/lib/activity-lead";
import {
  aplicarPlaceholders,
  mailtoUrl,
  whatsAppUrl,
} from "@/lib/lead-templates";
import { formatRelative } from "@/lib/business-days";
import type { LeadDuplicateCandidate } from "@/app/comercial/actions";
import { cn } from "@/lib/utils";

type LeadComRelacoes = Lead & {
  responsavel: { id: string; nome: string } | null;
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
};

interface LeadDetailHeroProps {
  lead: LeadComRelacoes;
  podeAgir: boolean;
  duplicatas: LeadDuplicateCandidate[];
  templatesWhatsapp: MensagemTemplate[];
  templatesEmail: MensagemTemplate[];
}

const ESTAGIO_CHIP: Record<string, string> = {
  novo: "bg-slate-100 text-slate-600 ring-slate-200",
  qualificado: "bg-royal-50 text-royal-700 ring-royal-100",
  proposta: "bg-amber-50 text-amber-700 ring-amber-100",
  negociacao: "bg-amber-100 text-amber-800 ring-amber-200",
  ganho: "bg-lima-50 text-lima-700 ring-lima-100",
  perdido: "bg-red-50 text-red-700 ring-red-100",
};

export function LeadDetailHero({
  lead,
  podeAgir: _podeAgir,
  duplicatas,
  templatesWhatsapp,
  templatesEmail,
}: LeadDetailHeroProps) {
  const router = useRouter();

  const placeholders = {
    nome: lead.contatoNome ?? lead.razaoSocial,
    empresa: lead.razaoSocial,
    contatoNome: lead.contatoNome,
    cargoInteresse: lead.cargoInteresse,
    recrutadora: lead.responsavel?.nome ?? null,
  };

  const idCurto = `${lead.id.slice(0, 8)}…`;
  const temTelefone = Boolean(lead.telefone);
  const temEmail = Boolean(lead.email);

  function handleClose() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/comercial");
    }
  }

  function abrirWhatsApp(template: MensagemTemplate) {
    const corpo = aplicarPlaceholders(template.corpo, placeholders);
    const url = whatsAppUrl(lead.telefone, corpo);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function abrirEmail(template: MensagemTemplate) {
    const assunto = template.assunto
      ? aplicarPlaceholders(template.assunto, placeholders)
      : "";
    const corpo = aplicarPlaceholders(template.corpo, placeholders);
    const url = mailtoUrl(lead.email, assunto, corpo);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="card-hero p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar nome={lead.razaoSocial} size="lg" gradient />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h2 text-ink text-balance">
                {lead.razaoSocial}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  ESTAGIO_CHIP[lead.estagio] ?? ESTAGIO_CHIP.novo,
                )}
              >
                {descricaoEstagioLead(lead.estagio)}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {idCurto}
              </span>
            </div>
            {lead.nomeFantasia ? (
              <p className="mt-1 text-sm text-slate-500">{lead.nomeFantasia}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              {lead.responsavel ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar nome={lead.responsavel.nome} size="xs" />
                  <span className="text-slate-600">{lead.responsavel.nome}</span>
                </span>
              ) : (
                <span className="text-slate-400">Sem responsável</span>
              )}
              <span className="text-slate-300">·</span>
              <span>Criado {formatRelative(lead.createdAt)}</span>
              <span className="text-slate-300">·</span>
              <span>Atualizado {formatRelative(lead.updatedAt)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="btn-icon"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TemplateMenu
          label="WhatsApp"
          icon={<MessageCircle size={16} />}
          variant="lima"
          disabled={!temTelefone}
          disabledReason="Lead sem telefone"
          templates={templatesWhatsapp}
          onPick={abrirWhatsApp}
        />
        <TemplateMenu
          label="Email"
          icon={<Mail size={16} />}
          variant="ink"
          disabled={!temEmail}
          disabledReason="Lead sem email"
          templates={templatesEmail}
          onPick={abrirEmail}
        />
      </div>

      {lead.cliente ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lima-100 bg-lima-50/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-lima-700">
            <CheckCircle2 size={16} />
            <span className="font-semibold">Cliente:</span>
            <span>{lead.cliente.razaoSocial}</span>
          </div>
          <Link
            href={`/clientes/${lead.cliente.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-lima-700 transition hover:text-lima-700/80"
          >
            Abrir cliente
            <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : null}

      {duplicatas.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-amber-800">
                Possível duplicata
              </div>
              <p className="mt-0.5 text-xs text-amber-700">
                {motivoMatch(duplicatas)} batem com lead{duplicatas.length > 1 ? "s" : ""} já cadastrado{duplicatas.length > 1 ? "s" : ""}:
              </p>
              <ul className="mt-2 space-y-1">
                {duplicatas.map((dup) => (
                  <li key={dup.id}>
                    <Link
                      href={`/comercial/leads/${dup.id}`}
                      className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-amber-900 transition hover:bg-amber-100/70"
                    >
                      <span className="font-mono text-[10px] uppercase text-amber-700">
                        {dup.id.slice(0, 8)}…
                      </span>
                      <span className="font-semibold">{dup.razaoSocial}</span>
                      <span className="text-amber-700">
                        ({matchLabel(dup.match)})
                      </span>
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 transition group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function matchLabel(match: LeadDuplicateCandidate["match"]): string {
  if (match === "email") return "email";
  if (match === "telefone") return "telefone";
  return "CNPJ";
}

function motivoMatch(duplicatas: LeadDuplicateCandidate[]): string {
  const tipos = new Set(duplicatas.map((d) => d.match));
  const labels: string[] = [];
  if (tipos.has("email")) labels.push("Email");
  if (tipos.has("telefone")) labels.push("Telefone");
  if (tipos.has("cnpj")) labels.push("CNPJ");
  return labels.join(" / ");
}

interface TemplateMenuProps {
  label: string;
  icon: React.ReactNode;
  variant: "lima" | "ink";
  disabled: boolean;
  disabledReason?: string;
  templates: MensagemTemplate[];
  onPick: (template: MensagemTemplate) => void;
}

function TemplateMenu({
  label,
  icon,
  variant,
  disabled,
  disabledReason,
  templates,
  onPick,
}: TemplateMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonClasses =
    variant === "lima"
      ? "bg-lima text-white shadow-xs hover:bg-lima-600 hover:shadow-glow-lima"
      : "bg-ink text-white shadow-xs hover:bg-slate-800";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled || templates.length === 0}
        className={cn(
          "inline-flex h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ease-smooth",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-200 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          buttonClasses,
        )}
        title={
          disabled
            ? disabledReason
            : templates.length === 0
              ? "Nenhum template ativo"
              : undefined
        }
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && templates.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 z-30 mt-1.5 origin-top overflow-hidden rounded-xl border border-line/70 bg-white shadow-lg"
          >
            <div className="border-b border-line/70 px-3 py-2">
              <span className="section-label">Templates · {label}</span>
            </div>
            <ul className="max-h-72 overflow-y-auto p-1">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(t);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {t.nome}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {t.assunto ?? primeiraLinha(t.corpo)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function primeiraLinha(texto: string): string {
  const linha = texto.split("\n").find((l) => l.trim().length > 0) ?? "";
  return linha.length > 80 ? `${linha.slice(0, 77)}…` : linha;
}
