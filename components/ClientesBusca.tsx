"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ClientesTable } from "./ClientesTable";
import type { ClienteRow } from "./ClienteTypes";

interface ClientesBuscaProps {
  initial: ClienteRow[];
}

function normaliza(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ClientesBusca({ initial }: ClientesBuscaProps) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = normaliza(query.trim());
    if (!q) return initial;
    const qDigits = query.replace(/\D+/g, "");
    return initial.filter((c) => {
      if (normaliza(c.razaoSocial).includes(q)) return true;
      if (c.nomeFantasia && normaliza(c.nomeFantasia).includes(q)) return true;
      if (c.cnpj && qDigits.length > 0 && c.cnpj.includes(qDigits)) return true;
      return false;
    });
  }, [initial, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search size={16} className="input-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por razão social, nome fantasia ou CNPJ"
          className="input input-with-icon"
          aria-label="Buscar clientes"
        />
      </div>

      <ClientesTable clientes={filtrados} />
    </div>
  );
}
