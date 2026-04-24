"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Fluxo, Vaga } from "@prisma/client";
import {
  atualizarVaga,
  encerrarVaga,
  reabrirVaga,
} from "@/app/vagas/[id]/actions";
import { useConfirm } from "./ConfirmDialog";

interface VagaInfoFormProps {
  vaga: Vaga & { recrutador?: { id: string; nome: string } | null };
  recrutadores: { id: string; nome: string }[];
  clientes: { id: string; razaoSocial: string; nomeFantasia: string | null }[];
  role: "recruiter" | "admin";
}

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Converte "YYYY-MM-DD" em Date à meio-dia local, consistente com
 * parseDateInput em app/vagas/nova/actions.ts, para evitar drift
 * de timezone entre criação e edição.
 */
function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function VagaInfoForm({
  vaga,
  recrutadores,
  clientes,
  role,
}: VagaInfoFormProps) {
  const isAdmin = role === "admin";

  const [titulo, setTitulo] = useState(vaga.titulo);
  const [clienteId, setClienteId] = useState<string>(vaga.clienteId ?? "");
  const [obs, setObs] = useState(vaga.obs ?? "");
  const [dataBriefing, setDataBriefing] = useState(
    toDateInputValue(vaga.dataBriefing),
  );
  const [dataPrazo, setDataPrazo] = useState(toDateInputValue(vaga.dataPrazo));
  const [fluxo, setFluxo] = useState<Fluxo>(vaga.fluxo);
  const [recrutadorId, setRecrutadorId] = useState(vaga.recrutadorId);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  const recrutadorNome =
    vaga.recrutador?.nome ??
    recrutadores.find((r) => r.id === vaga.recrutadorId)?.nome ??
    "—";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const briefing = parseDateInput(dataBriefing);
    if (!briefing) {
      setError("Informe a data de briefing");
      return;
    }

    if (!clienteId) {
      setError("Selecione um cliente");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      clienteId,
      obs: obs.trim() ? obs.trim() : null,
      dataBriefing: briefing,
      dataPrazo: parseDateInput(dataPrazo),
      fluxo,
      // recrutadorId só é enviado por admin; o servidor ignora o valor
      // para qualquer outro role (defesa em profundidade).
      ...(isAdmin ? { recrutadorId } : {}),
    };

    startTransition(async () => {
      const result = await atualizarVaga(vaga.id, payload);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSuccess("Alterações salvas.");
        toast.success("Alterações salvas");
      }
    });
  };

  const handleEncerrar = async () => {
    const ok = await confirm({
      title: "Encerrar vaga",
      message:
        "O processo será fechado e os marcos futuros não vão mais disparar alertas. Você pode reabrir a qualquer momento.",
      confirmLabel: "Encerrar vaga",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await encerrarVaga(vaga.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Vaga encerrada");
      }
    });
  };

  const handleReabrir = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await reabrirVaga(vaga.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Vaga reaberta");
      }
    });
  };

  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold mb-1">Informações gerais</h2>
      <p className="text-sm text-slate-500 mb-4">
        Edite os dados da vaga e salve as alterações.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isAdmin ? (
          <div>
            <label htmlFor="recrutadorId" className="label">
              Recrutador responsável
            </label>
            <select
              id="recrutadorId"
              value={recrutadorId}
              disabled={isPending}
              onChange={(e) => setRecrutadorId(e.target.value)}
              className="input"
            >
              {recrutadores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
              {!recrutadores.find((r) => r.id === recrutadorId) && (
                <option value={recrutadorId}>{recrutadorNome}</option>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">Recrutador responsável</label>
            <input
              type="text"
              value={recrutadorNome}
              readOnly
              className="input bg-slate-50 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label htmlFor="titulo" className="label">
            Título da vaga
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={isPending}
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="cliente" className="label">
            Cliente
          </label>
          <select
            id="cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            disabled={isPending}
            required
            className="input"
          >
            <option value="" disabled>
              Selecione um cliente…
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razaoSocial}
                {c.nomeFantasia ? ` (${c.nomeFantasia})` : ""}
              </option>
            ))}
            {/* Fallback: se o cliente atual foi arquivado e não aparece
                na lista filtrada, mostra como opção desabilitada pra
                preservar o valor exibido. */}
            {vaga.clienteId &&
              !clientes.find((c) => c.id === vaga.clienteId) && (
                <option value={vaga.clienteId}>
                  {vaga.cliente} (arquivado)
                </option>
              )}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dataBriefing" className="label">
              Data do briefing
            </label>
            <input
              id="dataBriefing"
              type="date"
              value={dataBriefing}
              onChange={(e) => setDataBriefing(e.target.value)}
              disabled={isPending}
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor="dataPrazo" className="label">
              Prazo final (opcional)
            </label>
            <input
              id="dataPrazo"
              type="date"
              value={dataPrazo}
              onChange={(e) => setDataPrazo(e.target.value)}
              disabled={isPending}
              placeholder="automático"
              className="input"
            />
            {!dataPrazo && (
              <p className="text-xs text-slate-500 mt-1">
                Deixe em branco para calcular automaticamente pelo fluxo.
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="fluxo" className="label">
            Fluxo
          </label>
          <select
            id="fluxo"
            value={fluxo}
            onChange={(e) => setFluxo(e.target.value as Fluxo)}
            disabled={isPending}
            className="input"
          >
            <option value="padrao">Padrão (30 dias úteis)</option>
            <option value="rapido">Rápido (21 dias úteis)</option>
          </select>
        </div>

        <div>
          <label htmlFor="obs" className="label">
            Observações
          </label>
          <textarea
            id="obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={isPending}
            rows={4}
            className="input resize-y"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>

          {vaga.encerrada ? (
            <button
              type="button"
              onClick={handleReabrir}
              disabled={isPending}
              className="btn-secondary"
            >
              {isPending ? "Salvando…" : "Reabrir vaga"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEncerrar}
              disabled={isPending}
              className="btn-danger"
            >
              {isPending ? "Salvando…" : "Encerrar vaga"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-lima-700" role="status">
            {success}
          </p>
        )}
      </form>
    </section>
  );
}
