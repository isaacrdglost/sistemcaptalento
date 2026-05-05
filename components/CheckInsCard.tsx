"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  TriangleAlert,
} from "lucide-react";
import { registrarCheckIn } from "@/app/contratacoes/actions";
import { formatDateBR } from "@/lib/business-days";

export interface CheckInItem {
  id: string;
  diasApos: number;
  agendadoPara: Date;
  realizadoEm: Date | null;
  resultado: string | null;
  observacao: string | null;
  autorNome: string | null;
}

interface CheckInsCardProps {
  checkIns: CheckInItem[];
  podeRegistrar: boolean;
}

export function CheckInsCard({
  checkIns,
  podeRegistrar,
}: CheckInsCardProps) {
  if (checkIns.length === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="section-label mb-3">Check-ins de adaptação</h2>
      <p className="mb-3 text-xs text-slate-500">
        Pequenos contatos com o cliente nos D+7, D+15 e D+25 da admissão.
        Não só atende bem — vira evidência se a garantia for contestada.
      </p>
      <ul className="space-y-2">
        {checkIns.map((c) => (
          <CheckInRow
            key={c.id}
            item={c}
            podeRegistrar={podeRegistrar}
          />
        ))}
      </ul>
    </section>
  );
}

function CheckInRow({
  item,
  podeRegistrar,
}: {
  item: CheckInItem;
  podeRegistrar: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [aberto, setAberto] = useState(false);

  function registrar(resultado: "ok" | "atencao" | "alerta") {
    if (submitting) return;
    setSubmitting(true);
    startTransition(async () => {
      const r = await registrarCheckIn({
        checkInId: item.id,
        resultado,
        observacao,
      });
      if (!r.ok) {
        toast.error(r.error);
        setSubmitting(false);
        return;
      }
      toast.success("Check-in registrado.");
      setAberto(false);
      setSubmitting(false);
      router.refresh();
    });
  }

  const realizado = item.realizadoEm !== null;
  const atrasado = !realizado && item.agendadoPara < new Date();
  const resultadoMeta = realizado
    ? RESULTADO_META[item.resultado ?? "ok"] ?? RESULTADO_META.ok
    : null;

  return (
    <li
      className={`rounded-lg border p-3 transition ${
        realizado
          ? "border-line bg-slate-50/40"
          : atrasado
            ? "border-amber-200 bg-amber-50/40"
            : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CalendarCheck size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-ink">
              D+{item.diasApos}
            </span>
            <span className="text-xs text-slate-500">
              · {formatDateBR(item.agendadoPara)}
            </span>
            {atrasado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                <TriangleAlert size={10} />
                atrasado
              </span>
            )}
            {realizado && resultadoMeta && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${resultadoMeta.classes}`}
              >
                {resultadoMeta.label}
              </span>
            )}
          </div>
          {realizado && item.observacao && (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-600">
              {item.observacao}
            </p>
          )}
          {realizado && item.autorNome && (
            <p className="mt-1 text-[11px] text-slate-400">
              registrado por {item.autorNome}
            </p>
          )}
        </div>
        {!realizado && podeRegistrar && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="btn-secondary shrink-0 text-xs"
          >
            {aberto ? "Cancelar" : "Registrar"}
          </button>
        )}
      </div>
      {!realizado && podeRegistrar && aberto && (
        <div className="mt-3 space-y-2">
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observação (opcional)"
            className="input min-h-[44px] resize-y text-sm"
            maxLength={2000}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => registrar("ok")}
              disabled={submitting}
              className="rounded-lg border border-lima-200 bg-lima-50 px-3 py-1.5 text-xs font-semibold text-lima-700 transition hover:bg-lima-100"
            >
              <Check size={12} className="-mt-0.5 mr-1 inline" />
              OK
            </button>
            <button
              type="button"
              onClick={() => registrar("atencao")}
              disabled={submitting}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <TriangleAlert size={12} className="-mt-0.5 mr-1 inline" />
              Atenção
            </button>
            <button
              type="button"
              onClick={() => registrar("alerta")}
              disabled={submitting}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <AlertTriangle size={12} className="-mt-0.5 mr-1 inline" />
              Alerta
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

const RESULTADO_META: Record<string, { label: string; classes: string }> = {
  ok: {
    label: "OK",
    classes: "bg-lima-100 text-lima-700 ring-lima-200",
  },
  atencao: {
    label: "Atenção",
    classes: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  alerta: {
    label: "Alerta",
    classes: "bg-red-100 text-red-700 ring-red-200",
  },
};
