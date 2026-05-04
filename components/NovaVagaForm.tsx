"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarVaga } from "@/app/vagas/nova/actions";
import { getFluxoSpec } from "@/lib/flows";
import type { AppRole } from "@/lib/auth";
import type { Fluxo } from "@prisma/client";

interface NovaVagaFormProps {
  recrutadores: { id: string; nome: string }[];
  clientes: { id: string; razaoSocial: string; nomeFantasia: string | null }[];
  clienteIdInicial?: string;
  currentUser: {
    id: string;
    nome: string;
    role: AppRole;
  };
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NovaVagaForm({
  recrutadores,
  clientes,
  clienteIdInicial,
  currentUser,
}: NovaVagaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string>(clienteIdInicial ?? "");
  const [obs, setObs] = useState("");
  const [dataBriefing, setDataBriefing] = useState<string>(todayISO());
  const [dataPrazo, setDataPrazo] = useState<string>("");
  const [fluxo, setFluxo] = useState<Fluxo>("padrao");
  const [recrutadorId, setRecrutadorId] = useState<string>(
    currentUser.role === "recruiter" ? currentUser.id : "",
  );

  const marcos = useMemo(() => getFluxoSpec(fluxo), [fluxo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (titulo.trim().length < 2) {
      setError("Informe um título com ao menos 2 caracteres");
      return;
    }
    if (!clienteId) {
      setError("Selecione um cliente");
      return;
    }
    if (!dataBriefing) {
      setError("Data do briefing é obrigatória");
      return;
    }
    if (currentUser.role === "admin" && !recrutadorId) {
      setError("Selecione uma recrutadora para a vaga");
      return;
    }

    startTransition(async () => {
      const result = await criarVaga({
        titulo: titulo.trim(),
        clienteId,
        obs: obs.trim() ? obs.trim() : undefined,
        dataBriefing,
        dataPrazo: dataPrazo ? dataPrazo : undefined,
        fluxo,
        recrutadorId:
          currentUser.role === "admin" ? recrutadorId : undefined,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/vagas/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="recrutador" className="label">
          Recrutador
        </label>
        {currentUser.role === "recruiter" ? (
          <input
            id="recrutador"
            type="text"
            className="input"
            value={currentUser.nome}
            disabled
            readOnly
          />
        ) : (
          <>
            <select
              id="recrutador"
              className="input"
              value={recrutadorId}
              onChange={(e) => setRecrutadorId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione uma recrutadora…
              </option>
              {recrutadores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
            {recrutadores.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Nenhuma recrutadora ativa. Cadastre uma em /admin antes de
                abrir vagas.
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="titulo" className="label">
          Título da vaga
        </label>
        <input
          id="titulo"
          type="text"
          className="input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Analista de Marketing Pleno"
          required
          minLength={2}
        />
      </div>

      <div>
        <label htmlFor="cliente" className="label">
          Cliente
        </label>
        <select
          id="cliente"
          className="input"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          required
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
        </select>
        {clientes.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">
            Nenhum cliente ativo cadastrado.{" "}
            <Link
              href="/clientes"
              className="font-semibold text-royal underline"
            >
              Cadastrar agora
            </Link>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="obs" className="label">
          Observações
        </label>
        <textarea
          id="obs"
          className="input min-h-[96px]"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Detalhes do briefing, requisitos especiais, etc."
          rows={4}
        />
      </div>

      <div>
        <label htmlFor="dataBriefing" className="label">
          Data do briefing
        </label>
        <input
          id="dataBriefing"
          type="date"
          className="input"
          value={dataBriefing}
          onChange={(e) => setDataBriefing(e.target.value)}
          required
        />
      </div>

      <div>
        <span className="label">Fluxo</span>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="radio"
              name="fluxo"
              value="padrao"
              checked={fluxo === "padrao"}
              onChange={() => setFluxo("padrao")}
              className="accent-royal"
            />
            <span>Padrão — 30 dias úteis</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="radio"
              name="fluxo"
              value="rapido"
              checked={fluxo === "rapido"}
              onChange={() => setFluxo("rapido")}
              className="accent-royal"
            />
            <span>Rápido — 21 dias úteis</span>
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Marcos do fluxo selecionado
          </div>
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {marcos.map((m) => (
              <li key={m.key} className="flex justify-between gap-3">
                <span>{m.label}</span>
                <span className="text-xs text-slate-500">
                  {m.offsetDays === 0
                    ? "D+0 (publicação)"
                    : m.offsetDays < 0
                    ? `D${m.offsetDays}`
                    : `D+${m.offsetDays}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <label htmlFor="dataPrazo" className="label">
          Data prazo final
        </label>
        <input
          id="dataPrazo"
          type="date"
          className="input"
          value={dataPrazo}
          onChange={(e) => setDataPrazo(e.target.value)}
          placeholder="calculado automaticamente pelo fluxo"
        />
        <p className="mt-1 text-xs text-slate-500">
          Opcional — se em branco, será calculado automaticamente pelo fluxo
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/dashboard")}
          disabled={pending}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Criando..." : "Criar vaga"}
        </button>
      </div>
    </form>
  );
}
