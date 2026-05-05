"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type { Fluxo, Modelo, Senioridade, Vaga } from "@prisma/client";
import type { AppRole } from "@/lib/auth";
import {
  atualizarVaga,
  encerrarVaga,
  reabrirVaga,
} from "@/app/vagas/[id]/actions";
import { useConfirm } from "./ConfirmDialog";
import { Select, type SelectOption } from "@/components/ui/Select";
import { GarantiaToggle } from "./GarantiaToggle";

const FLUXO_OPTIONS: SelectOption[] = [
  { value: "padrao", label: "Padrão (30 dias úteis)" },
  { value: "rapido", label: "Rápido (21 dias úteis)" },
];

const SENIORIDADE_OPTIONS: SelectOption[] = [
  { value: "", label: "—" },
  { value: "estagio", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "lideranca", label: "Liderança" },
];

const MODELO_OPTIONS: SelectOption[] = [
  { value: "", label: "—" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];

interface VagaInfoFormProps {
  vaga: Vaga & { recrutador?: { id: string; nome: string } | null };
  recrutadores: { id: string; nome: string }[];
  clientes: { id: string; razaoSocial: string; nomeFantasia: string | null }[];
  role: AppRole;
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

function decimalToInputValue(
  value: Vaga["salarioMin"] | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  // Prisma Decimal tem toString(); number tem toString(); string já é string.
  return value.toString();
}

function parseSalarioInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
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
  const [temGarantia, setTemGarantia] = useState<boolean>(
    vaga.temGarantia ?? false,
  );
  const [recrutadorId, setRecrutadorId] = useState(vaga.recrutadorId);

  // Detalhes da posição (extras)
  const [senioridade, setSenioridade] = useState<Senioridade | "">(
    vaga.senioridade ?? "",
  );
  const [modelo, setModelo] = useState<Modelo | "">(vaga.modelo ?? "");
  const [localizacao, setLocalizacao] = useState(vaga.localizacao ?? "");
  const [area, setArea] = useState(vaga.area ?? "");
  const [salarioMin, setSalarioMin] = useState(
    decimalToInputValue(vaga.salarioMin),
  );
  const [salarioMax, setSalarioMax] = useState(
    decimalToInputValue(vaga.salarioMax),
  );

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

    const sMin = parseSalarioInput(salarioMin);
    const sMax = parseSalarioInput(salarioMax);
    if (sMin !== null && sMax !== null && sMin > sMax) {
      setError("Salário mínimo não pode ser maior que o máximo");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      clienteId,
      obs: obs.trim() ? obs.trim() : null,
      dataBriefing: briefing,
      dataPrazo: parseDateInput(dataPrazo),
      fluxo,
      temGarantia,
      senioridade: (senioridade || null) as Senioridade | null,
      modelo: (modelo || null) as Modelo | null,
      localizacao: localizacao.trim() ? localizacao.trim() : null,
      area: area.trim() ? area.trim() : null,
      salarioMin: sMin,
      salarioMax: sMax,
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
    <section className="card overflow-hidden">
      <header className="border-b border-line/70 px-6 pt-5 pb-4">
        <h2 className="text-h3 text-ink">Informações gerais</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Edite os dados da vaga e salve as alterações.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-4 px-6 py-5">
          {isAdmin ? (
            <div>
              <label htmlFor="recrutadorId" className="label">
                Recrutador responsável
              </label>
              <Select
                id="recrutadorId"
                value={recrutadorId}
                disabled={isPending}
                onChange={(v) => setRecrutadorId(v)}
                options={[
                  ...recrutadores.map((r) => ({ value: r.id, label: r.nome })),
                  ...(!recrutadores.find((r) => r.id === recrutadorId)
                    ? [{ value: recrutadorId, label: recrutadorNome }]
                    : []),
                ]}
              />
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
            <Select
              id="cliente"
              value={clienteId}
              onChange={(v) => setClienteId(v)}
              disabled={isPending}
              required
              placeholder="Selecione um cliente…"
              options={[
                ...clientes.map((c) => ({
                  value: c.id,
                  label: `${c.razaoSocial}${c.nomeFantasia ? ` (${c.nomeFantasia})` : ""}`,
                })),
                // Fallback: se o cliente atual foi arquivado e não aparece
                // na lista filtrada, mostra como opção pra preservar
                // o valor exibido.
                ...(vaga.clienteId &&
                !clientes.find((c) => c.id === vaga.clienteId)
                  ? [
                      {
                        value: vaga.clienteId,
                        label: `${vaga.cliente} (arquivado)`,
                      },
                    ]
                  : []),
              ]}
            />
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
                  Em branco = calculado pelo fluxo.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="fluxo" className="label">
              Fluxo
            </label>
            <Select
              id="fluxo"
              value={fluxo}
              onChange={(v) => setFluxo(v as Fluxo)}
              disabled={isPending}
              options={FLUXO_OPTIONS}
            />
          </div>

          <GarantiaToggle
            value={temGarantia}
            onChange={setTemGarantia}
            disabled={isPending}
          />

          {/* Detalhes da posição — colapsável */}
          <details
            className="group rounded-xl border border-line/70 bg-slate-50/40 open:bg-white"
            open={Boolean(
              vaga.senioridade ||
                vaga.modelo ||
                vaga.localizacao ||
                vaga.area ||
                vaga.salarioMin ||
                vaga.salarioMax,
            )}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-ink select-none">
              <span>Detalhes da posição</span>
              <ChevronDown
                size={16}
                className="text-slate-400 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>

            <div className="flex flex-col gap-4 border-t border-line/70 px-4 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="senioridade" className="label">
                    Senioridade
                  </label>
                  <Select
                    id="senioridade"
                    value={senioridade}
                    onChange={(v) => setSenioridade(v as Senioridade | "")}
                    disabled={isPending}
                    options={SENIORIDADE_OPTIONS}
                  />
                </div>

                <div>
                  <label htmlFor="modelo" className="label">
                    Modelo
                  </label>
                  <Select
                    id="modelo"
                    value={modelo}
                    onChange={(v) => setModelo(v as Modelo | "")}
                    disabled={isPending}
                    options={MODELO_OPTIONS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="area" className="label">
                    Área
                  </label>
                  <input
                    id="area"
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={isPending}
                    placeholder="Ex: Tecnologia, Vendas…"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="localizacao" className="label">
                    Localização
                  </label>
                  <input
                    id="localizacao"
                    type="text"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    disabled={isPending}
                    placeholder="Cidade/UF"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="salarioMin" className="label">
                    Salário mínimo (R$)
                  </label>
                  <input
                    id="salarioMin"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={100}
                    value={salarioMin}
                    onChange={(e) => setSalarioMin(e.target.value)}
                    disabled={isPending}
                    placeholder="0,00"
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="salarioMax" className="label">
                    Salário máximo (R$)
                  </label>
                  <input
                    id="salarioMax"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={100}
                    value={salarioMax}
                    onChange={(e) => setSalarioMax(e.target.value)}
                    disabled={isPending}
                    placeholder="0,00"
                    className="input"
                  />
                </div>
              </div>
            </div>
          </details>

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
        </div>

        {/* Rodapé sticky com ações */}
        <div className="sticky bottom-0 z-[1] flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-white/95 px-6 py-3 backdrop-blur">
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
      </form>
    </section>
  );
}
