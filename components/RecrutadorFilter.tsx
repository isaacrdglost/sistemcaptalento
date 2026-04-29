"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Users } from "lucide-react";

interface RecrutadorFilterProps {
  recrutadores: { id: string; nome: string; count?: number }[];
  current?: string;
  totalAtivas?: number;
}

export function RecrutadorFilter({
  recrutadores,
  current,
  totalAtivas,
}: RecrutadorFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    startTransition(() => {
      if (!value) {
        router.push("/dashboard");
      } else {
        router.push(`/dashboard?rec=${encodeURIComponent(value)}`);
      }
    });
  }

  return (
    <div className="relative inline-flex items-center">
      <Users
        size={14}
        className="pointer-events-none absolute left-3 text-slate-400"
        aria-hidden
      />
      <select
        id="rec-filter"
        aria-label="Filtrar por recrutadora"
        className="input min-w-[14rem] pl-9 text-sm"
        value={current ?? ""}
        onChange={onChange}
        disabled={isPending}
      >
        <option value="">
          Todas as recrutadoras
          {typeof totalAtivas === "number" ? ` (${totalAtivas})` : ""}
        </option>
        {recrutadores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome}
            {typeof r.count === "number" ? ` (${r.count})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
