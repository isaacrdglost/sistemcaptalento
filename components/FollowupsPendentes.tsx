"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, Check, Coffee } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { marcarFollowupConcluido } from "@/app/comercial/actions";

interface FollowupItem {
  id: string;
  leadId: string;
  leadRazaoSocial: string;
  descricao: string;
  agendadoPara: Date;
  autor: { id: string; nome: string };
}

interface FollowupsPendentesProps {
  followups: FollowupItem[];
  currentUserId: string;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function diasDeDiferenca(target: Date, now: Date): number {
  const a = startOfDay(now).getTime();
  const b = startOfDay(target).getTime();
  return Math.round((b - a) / 86400000);
}

interface MarcarConcluidoButtonProps {
  atividadeId: string;
}

function MarcarConcluidoButton({ atividadeId }: MarcarConcluidoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await marcarFollowupConcluido(atividadeId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up concluído");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Marcar follow-up como concluído"
      title="Marcar como concluído"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-inset ring-line transition hover:border-lima-200 hover:bg-lima-50 hover:text-lima-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Check size={14} />
    </button>
  );
}

interface ItemRowProps {
  item: FollowupItem;
  tagTexto: string;
  tagClasse: string;
}

function ItemRow({ item, tagTexto, tagClasse }: ItemRowProps) {
  const hora = item.agendadoPara.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar nome={item.autor.nome} size="xs" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/comercial/leads/${item.leadId}`}
          className="block truncate text-sm font-semibold text-ink transition hover:text-royal"
        >
          {item.leadRazaoSocial}
        </Link>
        <div className="truncate text-xs text-slate-500">
          {item.descricao} · {hora}
        </div>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tagClasse}`}
      >
        {tagTexto}
      </span>
      <MarcarConcluidoButton atividadeId={item.id} />
    </li>
  );
}

export function FollowupsPendentes({
  followups,
  currentUserId: _currentUserId,
}: FollowupsPendentesProps) {
  const now = new Date();
  const hoje0 = startOfDay(now);
  const hoje23 = endOfDay(now);

  const atrasados: FollowupItem[] = [];
  const hoje: FollowupItem[] = [];
  const proximos: FollowupItem[] = [];

  for (const item of followups) {
    const ts = item.agendadoPara.getTime();
    if (ts < hoje0.getTime()) {
      atrasados.push(item);
    } else if (ts <= hoje23.getTime()) {
      hoje.push(item);
    } else {
      proximos.push(item);
    }
  }

  // Sempre exibe "Próximos 3 dias" quando há itens — antes só aparecia se
  // as outras seções estavam vazias e o usuário perdia visibilidade.
  const mostrarProximos = proximos.length > 0;

  const totalVisivel =
    atrasados.length + hoje.length + (mostrarProximos ? proximos.length : 0);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="section-label mb-1 flex items-center gap-1.5">
            <Bell size={11} />
            Follow-ups
          </div>
          <h2 className="text-h3 text-ink">Pra hoje e atrasados</h2>
        </div>
        {totalVisivel > 0 ? (
          <span className="text-xs text-slate-500">
            {totalVisivel} {totalVisivel === 1 ? "lembrete" : "lembretes"}
          </span>
        ) : null}
      </div>

      {totalVisivel === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lima-50 text-lima-700">
            <Coffee size={18} />
          </span>
          <p className="text-sm text-slate-600">
            Tudo limpo. Aproveita pra prospectar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {atrasados.length > 0 ? (
            <div>
              <div className="mb-1 flex items-center gap-2 text-eyebrow uppercase">
                <span className="text-red-600">Atrasados</span>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700">
                  {atrasados.length}
                </span>
              </div>
              <ul className="divide-y divide-line/70">
                {atrasados.map((item) => {
                  const dias = Math.abs(diasDeDiferenca(item.agendadoPara, now));
                  const tagTexto =
                    dias === 0
                      ? "Atrasado"
                      : dias === 1
                        ? "há 1 dia"
                        : `há ${dias} dias`;
                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      tagTexto={tagTexto}
                      tagClasse="bg-red-50 text-red-700 ring-red-100"
                    />
                  );
                })}
              </ul>
            </div>
          ) : null}

          {hoje.length > 0 ? (
            <div>
              <div className="mb-1 flex items-center gap-2 text-eyebrow uppercase">
                <span className="text-amber-700">Hoje</span>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                  {hoje.length}
                </span>
              </div>
              <ul className="divide-y divide-line/70">
                {hoje.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    tagTexto="Hoje"
                    tagClasse="bg-amber-50 text-amber-700 ring-amber-100"
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {mostrarProximos ? (
            <div>
              <div className="mb-1 flex items-center gap-2 text-eyebrow uppercase text-slate-500">
                Próximos 3 dias
              </div>
              <ul className="divide-y divide-line/70">
                {proximos.map((item) => {
                  const dias = diasDeDiferenca(item.agendadoPara, now);
                  const tagTexto =
                    dias === 1 ? "Em 1 dia" : `Em ${dias} dias`;
                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      tagTexto={tagTexto}
                      tagClasse="bg-slate-100 text-slate-600 ring-slate-200"
                    />
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
