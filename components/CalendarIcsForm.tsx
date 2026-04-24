"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import {
  atualizarCalendarioIcs,
  removerCalendarioIcs,
  testarCalendarioIcs,
} from "@/app/configuracoes/actions";
import { useConfirm } from "./ConfirmDialog";

interface CalendarIcsFormProps {
  urlMascarada: string | null;
}

export function CalendarIcsForm({ urlMascarada }: CalendarIcsFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState("");
  const [testeMsg, setTesteMsg] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);

  async function handleTest() {
    if (!url.trim()) {
      setTesteMsg({ tipo: "erro", texto: "Cole a URL primeiro" });
      return;
    }
    setTesting(true);
    setTesteMsg(null);
    const result = await testarCalendarioIcs(url.trim());
    setTesting(false);
    if ("error" in result) {
      setTesteMsg({ tipo: "erro", texto: result.error });
    } else {
      setTesteMsg({
        tipo: "ok",
        texto: `URL válida — ${result.eventosEncontrados} evento${result.eventosEncontrados === 1 ? "" : "s"} encontrado${result.eventosEncontrados === 1 ? "" : "s"}.`,
      });
    }
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Cole a URL antes de salvar");
      return;
    }
    startTransition(async () => {
      const result = await atualizarCalendarioIcs(url.trim());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Calendário conectado");
      setUrl("");
      setTesteMsg(null);
      router.refresh();
    });
  }

  async function handleRemover() {
    const ok = await confirm({
      title: "Desconectar calendário",
      message:
        "Sua URL será removida do sistema. Você pode reconectar a qualquer momento.",
      confirmLabel: "Desconectar",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removerCalendarioIcs();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Calendário desconectado");
        router.refresh();
      }
    });
  }

  return (
    <section className="card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal">
          <Calendar size={18} />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-ink">Google Agenda</h2>
          <p className="text-sm text-slate-500">
            Conecte seu calendário Google para importar candidatos direto das
            entrevistas que você agenda.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {urlMascarada ? (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Calendário conectado
            </div>
            <div className="font-mono text-xs text-slate-600 break-all">
              {urlMascarada}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemover}
                disabled={pending}
                className="btn-danger text-xs"
              >
                <Trash2 size={14} />
                {pending ? "Processando…" : "Desconectar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setTesteMsg(null);
                }}
                className="btn-ghost text-xs"
              >
                Trocar URL
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSalvar} className="mt-4 space-y-4">
          <div>
            <label htmlFor="icsUrl" className="label">
              URL secreta do calendário (iCal)
            </label>
            <input
              id="icsUrl"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              className="input font-mono text-xs"
              disabled={pending}
              autoComplete="off"
            />
            {testeMsg && (
              <p
                className={`mt-1 text-xs font-medium ${
                  testeMsg.tipo === "ok" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {testeMsg.texto}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending || !url.trim()}
              className="btn-primary"
            >
              {pending ? "Salvando…" : urlMascarada ? "Substituir URL" : "Conectar calendário"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="btn-secondary"
            >
              {testing ? "Testando…" : "Testar URL"}
            </button>
          </div>
        </form>

        <details className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">
            Como encontrar a URL no Google Agenda
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
            <li>
              Abra{" "}
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
              >
                Configurações do Google Agenda
                <ExternalLink size={12} />
              </a>
            </li>
            <li>
              No menu à esquerda, em "Configurações dos meus calendários",
              clique no calendário onde você agenda as entrevistas.
            </li>
            <li>
              Role até <strong>"Integrar calendário"</strong>.
            </li>
            <li>
              Copie o valor em{" "}
              <strong>"Endereço secreto no formato iCal"</strong> e cole
              acima.
            </li>
          </ol>
          <p className="mt-3 text-xs text-amber-700">
            Essa URL dá acesso de leitura à sua agenda inteira. Guardamos
            criptografada e nunca compartilhamos — mas se suspeitar que vazou,
            vá no Google Agenda e clique em <em>"Redefinir"</em> ao lado da
            URL para invalidar a antiga.
          </p>
        </details>
      </div>
    </section>
  );
}
