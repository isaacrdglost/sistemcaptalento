"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Lead, OrigemLead } from "@prisma/client";
import { criarLead, atualizarLead, type LeadInput } from "@/app/comercial/actions";
import { formatCNPJ } from "@/lib/format";

interface LeadInfoFormProps {
  mode: "create" | "edit";
  lead?: Lead;
  onSaved?: (id?: string) => void;
  /** Quando true, exibe inputs desabilitados e oculta botões de ação. */
  readOnly?: boolean;
}

const ORIGEM_OPCOES: { value: OrigemLead; label: string }[] = [
  { value: "prospeccao_ativa", label: "Prospecção ativa" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "redes_sociais", label: "Redes sociais" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "evento", label: "Evento" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

function maskCNPJ(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 14);
  let out = d;
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length > 5) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 8)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 12)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
      8,
      12,
    )}-${d.slice(12)}`;
  return out;
}

function maskPhone(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

interface FormState {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  segmento: string;
  site: string;
  contatoNome: string;
  contatoCargo: string;
  email: string;
  telefone: string;
  linkedinUrl: string;
  origem: OrigemLead;
  origemDescricao: string;
  mensagem: string;
  obs: string;
}

function leadToState(lead?: Lead): FormState {
  return {
    razaoSocial: lead?.razaoSocial ?? "",
    nomeFantasia: lead?.nomeFantasia ?? "",
    cnpj: lead?.cnpj ? formatCNPJ(lead.cnpj) : "",
    segmento: lead?.segmento ?? "",
    site: lead?.site ?? "",
    contatoNome: lead?.contatoNome ?? "",
    contatoCargo: lead?.contatoCargo ?? "",
    email: lead?.email ?? "",
    telefone: lead?.telefone ? maskPhone(lead.telefone) : "",
    linkedinUrl: lead?.linkedinUrl ?? "",
    origem: lead?.origem ?? "outro",
    origemDescricao: lead?.origemDescricao ?? "",
    mensagem: lead?.mensagem ?? "",
    obs: lead?.obs ?? "",
  };
}

export function LeadInfoForm({
  mode,
  lead,
  onSaved,
  readOnly = false,
}: LeadInfoFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => leadToState(lead));
  const [isPending, startTransition] = useTransition();
  const locked = readOnly || isPending;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (readOnly) return;
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload(): LeadInput {
    return {
      razaoSocial: state.razaoSocial.trim(),
      nomeFantasia: state.nomeFantasia.trim() || null,
      cnpj: state.cnpj.trim() || null,
      segmento: state.segmento.trim() || null,
      site: state.site.trim() || null,
      contatoNome: state.contatoNome.trim() || null,
      contatoCargo: state.contatoCargo.trim() || null,
      email: state.email.trim() || null,
      telefone: state.telefone.trim() || null,
      linkedinUrl: state.linkedinUrl.trim() || null,
      origem: state.origem,
      origemDescricao:
        state.origem === "outro" ? state.origemDescricao.trim() || null : null,
      mensagem: state.mensagem.trim() || null,
      obs: state.obs.trim() || null,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    if (!state.razaoSocial.trim()) {
      toast.error("Razão social é obrigatória");
      return;
    }
    const payload = buildPayload();

    if (mode === "create") {
      startTransition(async () => {
        const result = await criarLead(payload);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`Lead ${payload.razaoSocial} criado`);
        if (onSaved) {
          onSaved(result.id);
        } else {
          router.push(`/comercial/leads/${result.id}`);
          router.refresh();
        }
      });
    } else {
      if (!lead) return;
      startTransition(async () => {
        const result = await atualizarLead(lead.id, payload);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Alterações salvas");
        if (onSaved) {
          onSaved(lead.id);
        } else {
          router.refresh();
        }
      });
    }
  }

  function handleCancel() {
    if (mode === "create") {
      router.back();
    } else {
      setState(leadToState(lead));
    }
  }

  const submitLabel =
    mode === "create"
      ? isPending
        ? "Criando…"
        : "Criar lead"
      : isPending
        ? "Salvando…"
        : "Salvar alterações";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Empresa */}
      <section className="flex flex-col gap-4">
        <div className="section-label">Empresa</div>

        <div>
          <label htmlFor="lead-razao" className="label">
            Razão social <span className="text-red-500">*</span>
          </label>
          <input
            id="lead-razao"
            type="text"
            value={state.razaoSocial}
            onChange={(e) => update("razaoSocial", e.target.value)}
            disabled={locked}
            required
            className="input"
            placeholder="Empresa Exemplo LTDA"
          />
        </div>

        <div>
          <label htmlFor="lead-fantasia" className="label">
            Nome fantasia
          </label>
          <input
            id="lead-fantasia"
            type="text"
            value={state.nomeFantasia}
            onChange={(e) => update("nomeFantasia", e.target.value)}
            disabled={locked}
            className="input"
            placeholder="Como a empresa é conhecida no mercado"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-cnpj" className="label">
              CNPJ
            </label>
            <input
              id="lead-cnpj"
              type="text"
              value={state.cnpj}
              onChange={(e) => update("cnpj", maskCNPJ(e.target.value))}
              disabled={locked}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="lead-segmento" className="label">
              Segmento
            </label>
            <input
              id="lead-segmento"
              type="text"
              value={state.segmento}
              onChange={(e) => update("segmento", e.target.value)}
              disabled={locked}
              placeholder="Tech, Saúde, Varejo…"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lead-site" className="label">
            Site
          </label>
          <input
            id="lead-site"
            type="url"
            value={state.site}
            onChange={(e) => update("site", e.target.value)}
            disabled={locked}
            placeholder="https://empresa.com.br"
            className="input"
          />
        </div>
      </section>

      {/* Contato */}
      <section className="flex flex-col gap-4">
        <div className="section-label">Contato</div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-contato-nome" className="label">
              Nome do contato
            </label>
            <input
              id="lead-contato-nome"
              type="text"
              value={state.contatoNome}
              onChange={(e) => update("contatoNome", e.target.value)}
              disabled={locked}
              className="input"
              placeholder="Quem é a pessoa que conversamos"
            />
          </div>
          <div>
            <label htmlFor="lead-contato-cargo" className="label">
              Cargo
            </label>
            <input
              id="lead-contato-cargo"
              type="text"
              value={state.contatoCargo}
              onChange={(e) => update("contatoCargo", e.target.value)}
              disabled={locked}
              className="input"
              placeholder="Diretor de RH, CEO…"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-email" className="label">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              value={state.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={locked}
              className="input"
              placeholder="contato@empresa.com"
            />
          </div>
          <div>
            <label htmlFor="lead-telefone" className="label">
              Telefone
            </label>
            <input
              id="lead-telefone"
              type="tel"
              value={state.telefone}
              onChange={(e) => update("telefone", maskPhone(e.target.value))}
              disabled={locked}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lead-linkedin" className="label">
            LinkedIn
          </label>
          <input
            id="lead-linkedin"
            type="url"
            value={state.linkedinUrl}
            onChange={(e) => update("linkedinUrl", e.target.value)}
            disabled={locked}
            placeholder="https://linkedin.com/in/contato"
            className="input"
          />
        </div>
      </section>

      {/* Origem & contexto */}
      <section className="flex flex-col gap-4">
        <div className="section-label">Origem & contexto</div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-origem" className="label">
              Origem
            </label>
            <select
              id="lead-origem"
              value={state.origem}
              onChange={(e) => update("origem", e.target.value as OrigemLead)}
              disabled={locked}
              className="input"
            >
              {ORIGEM_OPCOES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {state.origem === "outro" ? (
            <div>
              <label htmlFor="lead-origem-desc" className="label">
                Descrever origem
              </label>
              <input
                id="lead-origem-desc"
                type="text"
                value={state.origemDescricao}
                onChange={(e) => update("origemDescricao", e.target.value)}
                disabled={locked}
                placeholder="Como esse lead chegou?"
                className="input"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="lead-mensagem" className="label">
            Mensagem / contexto inicial
          </label>
          <textarea
            id="lead-mensagem"
            value={state.mensagem}
            onChange={(e) => update("mensagem", e.target.value)}
            disabled={locked}
            rows={3}
            className="input resize-y"
            placeholder="O que o lead disse na primeira interação"
          />
        </div>

        <div>
          <label htmlFor="lead-obs" className="label">
            Observações internas
          </label>
          <textarea
            id="lead-obs"
            value={state.obs}
            onChange={(e) => update("obs", e.target.value)}
            disabled={locked}
            rows={3}
            className="input resize-y"
            placeholder="Anotações pra equipe comercial"
          />
        </div>
      </section>

      {readOnly ? (
        <div className="rounded-lg border border-line/70 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
          Lead finalizado — campos em modo somente leitura. Pra editar, reabra
          o lead acima.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
          <button type="submit" disabled={locked} className="btn-primary">
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={locked}
            className="btn-ghost"
          >
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
