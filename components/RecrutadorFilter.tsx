"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/Select";

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

  function onChange(value: string) {
    startTransition(() => {
      if (!value) {
        router.push("/dashboard");
      } else {
        router.push(`/dashboard?rec=${encodeURIComponent(value)}`);
      }
    });
  }

  const options = [
    {
      value: "",
      label: `Todas as recrutadoras${typeof totalAtivas === "number" ? ` (${totalAtivas})` : ""}`,
    },
    ...recrutadores.map((r) => ({
      value: r.id,
      label: `${r.nome}${typeof r.count === "number" ? ` (${r.count})` : ""}`,
    })),
  ];

  return (
    <Select
      id="rec-filter"
      ariaLabel="Filtrar por recrutadora"
      className="min-w-[14rem]"
      value={current ?? ""}
      onChange={onChange}
      disabled={isPending}
      options={options}
    />
  );
}
