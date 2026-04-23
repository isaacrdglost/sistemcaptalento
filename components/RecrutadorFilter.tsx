"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface RecrutadorFilterProps {
  recrutadores: { id: string; nome: string }[];
  current?: string;
}

export function RecrutadorFilter({
  recrutadores,
  current,
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
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor="rec-filter">
        Filtrar por recrutadora
      </label>
      <select
        id="rec-filter"
        className="input max-w-xs"
        value={current ?? ""}
        onChange={onChange}
        disabled={isPending}
      >
        <option value="">Todas</option>
        {recrutadores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
