"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Cliente } from "@prisma/client";
import {
  arquivarCliente,
  atualizarCliente,
  reativarCliente,
} from "@/app/clientes/actions";
import { useConfirm } from "./ConfirmDialog";
import { formatCNPJ } from "@/lib/format";

interface ClienteInfoFormProps {
  cliente: Cliente;
  role: "admin" | "recruiter";
}

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

export function ClienteInfoForm({ cliente, role }: ClienteInfoFormProps) {
  const isAdmin = role === "admin";
  const router = useRouter();
  const confirm = useConfirm();

  const [razaoSocial, setRazaoSocial] = useState(cliente.razaoSocial);
  const [nomeFantasia, setNomeFantasia] = useState(cliente.nomeFantasia ?? "");
  const [cnpj, setCnpj] = useState(formatCNPJ(cliente.cnpj ?? ""));
  const [contatoResponsavel, setContatoResponsavel] = useState(
    cliente.contatoResponsavel ?? "",
  );
  const [emailPrincipal, setEmailPrincipal] = useState(
    cliente.emailPrincipal ?? "",
  );
  const [telefone, setTelefone] = useState(
    cliente.telefone ? maskPhone(cliente.telefone) : "",
  );
  const [segmento, setSegmento] = useState(cliente.segmento ?? "");
  const [obs, setObs] = useState(cliente.obs ?? "");
  const [ativo, setAtivo] = useState(cliente.ativo);

  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const razao = razaoSocial.trim();
    if (!razao) {
      toast.error("Razão social é obrigatória");
      return;
    }
    const payload = {
      razaoSocial: razao,
      nomeFantasia: nomeFantasia.trim() || null,
      cnpj: cnpj.trim() || null,
      contatoResponsavel: contatoResponsavel.trim() || null,
      emailPrincipal: emailPrincipal.trim() || null,
      telefone: telefone.trim() || null,
      segmento: segmento.trim() || null,
      obs: obs.trim() || null,
      // `ativo` só é controlado pelo admin via switch; recruiter envia valor
      // atual (vindo do DB) pra não conseguir alterar por este form.
      ativo: isAdmin ? ativo : cliente.ativo,
    };

    startTransition(async () => {
      const result = await atualizarCliente(cliente.id, payload);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Alterações salvas");
        router.refresh();
      }
    });
  }

  async function handleArquivar() {
    const ok = await confirm({
      title: "Arquivar cliente",
      message:
        "Clientes arquivados ficam escondidos da seleção de novas vagas, mas o histórico permanece.",
      confirmLabel: "Arquivar",
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await arquivarCliente(cliente.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Cliente arquivado");
        setAtivo(false);
        router.refresh();
      }
    });
  }

  function handleReativar() {
    startTransition(async () => {
      const result = await reativarCliente(cliente.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Cliente reativado");
        setAtivo(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="card p-6">
      <h2 className="mb-1 text-lg font-bold">Informações do cliente</h2>
      <p className="mb-4 text-sm text-slate-500">
        Edite os dados e salve as alterações.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="cli-razao" className="label">
            Razão social <span className="text-red-500">*</span>
          </label>
          <input
            id="cli-razao"
            type="text"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            disabled={isPending}
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="cli-fantasia" className="label">
            Nome fantasia
          </label>
          <input
            id="cli-fantasia"
            type="text"
            value={nomeFantasia}
            onChange={(e) => setNomeFantasia(e.target.value)}
            disabled={isPending}
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cli-cnpj" className="label">
              CNPJ
            </label>
            <input
              id="cli-cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              disabled={isPending}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="cli-segmento" className="label">
              Segmento
            </label>
            <input
              id="cli-segmento"
              type="text"
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              disabled={isPending}
              placeholder="Tech, Saúde, Varejo…"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cli-contato" className="label">
            Contato responsável
          </label>
          <input
            id="cli-contato"
            type="text"
            value={contatoResponsavel}
            onChange={(e) => setContatoResponsavel(e.target.value)}
            disabled={isPending}
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cli-email" className="label">
              Email principal
            </label>
            <input
              id="cli-email"
              type="email"
              value={emailPrincipal}
              onChange={(e) => setEmailPrincipal(e.target.value)}
              disabled={isPending}
              className="input"
              placeholder="contato@empresa.com"
            />
          </div>
          <div>
            <label htmlFor="cli-telefone" className="label">
              Telefone
            </label>
            <input
              id="cli-telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              disabled={isPending}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cli-obs" className="label">
            Observações
          </label>
          <textarea
            id="cli-obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={isPending}
            rows={4}
            className="input resize-y"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-ink">Cliente ativo</div>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? "Clientes arquivados somem da seleção de novas vagas."
                : "Apenas admin pode alterar este status."}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={!isAdmin || isPending}
            />
            <span
              className={`relative h-6 w-11 rounded-full transition ${
                ativo ? "bg-royal" : "bg-slate-300"
              } ${!isAdmin ? "opacity-60" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                  ativo ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>

          {isAdmin && ativo ? (
            <button
              type="button"
              onClick={handleArquivar}
              disabled={isPending}
              className="btn-danger"
            >
              {isPending ? "Salvando…" : "Arquivar cliente"}
            </button>
          ) : null}

          {isAdmin && !ativo ? (
            <button
              type="button"
              onClick={handleReativar}
              disabled={isPending}
              className="btn-secondary"
            >
              {isPending ? "Salvando…" : "Reativar cliente"}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
