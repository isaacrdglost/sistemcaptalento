"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { vincularTalentoAVaga } from "@/app/talentos/actions";
import { Select } from "@/components/ui/Select";

interface VagaOpcao {
  id: string;
  titulo: string;
  cliente: string;
}

interface VincularTalentoVagaProps {
  talentoId: string;
  vagas: VagaOpcao[];
  vagasJaVinculadas: string[];
}

export function VincularTalentoVaga({
  talentoId,
  vagas,
  vagasJaVinculadas,
}: VincularTalentoVagaProps) {
  const router = useRouter();
  const [vagaId, setVagaId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleVincular() {
    if (!vagaId) {
      toast.error("Selecione uma vaga");
      return;
    }
    startTransition(async () => {
      const result = await vincularTalentoAVaga(talentoId, vagaId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.jaExistia) {
        toast.info("Este talento já estava vinculado a essa vaga");
      } else {
        toast.success("Talento adicionado à vaga");
      }
      setVagaId("");
      router.refresh();
    });
  }

  if (vagas.length === 0) {
    return (
      <div className="card p-5 text-sm text-slate-500">
        <h2 className="mb-2 text-base font-bold text-ink">
          Adicionar a uma vaga
        </h2>
        <p>Nenhuma vaga ativa disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-base font-bold text-ink">
        Adicionar a uma vaga
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Vincule este talento como candidato de uma vaga ativa.
      </p>

      <div className="flex flex-col gap-2">
        <Select
          value={vagaId}
          onChange={(v) => setVagaId(v)}
          disabled={isPending}
          ariaLabel="Selecionar vaga"
          placeholder="Selecione uma vaga…"
          options={vagas.map((v) => {
            const jaVinculada = vagasJaVinculadas.includes(v.id);
            return {
              value: v.id,
              label: `${v.titulo} — ${v.cliente}${jaVinculada ? " (já vinculado)" : ""}`,
            };
          })}
        />
        <button
          type="button"
          onClick={handleVincular}
          disabled={isPending || !vagaId}
          className="btn-primary"
        >
          <Link2 size={14} className="shrink-0" />
          <span>{isPending ? "Vinculando…" : "Vincular"}</span>
        </button>
      </div>
    </div>
  );
}
