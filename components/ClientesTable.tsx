"use client";

import Link from "next/link";
import { Mail, Phone, Tag } from "lucide-react";
import { formatCNPJ, formatPhone, getInitials } from "@/lib/format";
import type { ClienteRow } from "./ClienteTypes";

interface ClientesTableProps {
  clientes: ClienteRow[];
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  if (clientes.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Nenhum cliente encontrado
      </div>
    );
  }

  return (
    <div className="grid animate-fade-in-up gap-5 md:grid-cols-2 xl:grid-cols-3">
      {clientes.map((cliente, i) => {
        const metaParts: string[] = [];
        if (cliente.segmento) metaParts.push(cliente.segmento);
        if (cliente.emailPrincipal) metaParts.push(cliente.emailPrincipal);
        if (cliente.telefone) metaParts.push(formatPhone(cliente.telefone));

        return (
          <Link
            key={cliente.id}
            href={`/clientes/${cliente.id}`}
            className="card-interactive flex flex-col gap-3 p-5 animate-fade-in-up"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  cliente.ativo
                    ? "bg-gradient-royal text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
                aria-hidden
              >
                {getInitials(cliente.razaoSocial)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-ink">
                  {cliente.razaoSocial}
                </h3>
                {cliente.nomeFantasia ? (
                  <p className="truncate text-sm text-slate-500">
                    {cliente.nomeFantasia}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!cliente.ativo ? (
                <span className="badge-slate">Arquivado</span>
              ) : cliente.vagasAbertas > 0 ? (
                <span className="badge-lima">
                  {cliente.vagasAbertas === 1
                    ? "1 vaga aberta"
                    : `${cliente.vagasAbertas} vagas abertas`}
                </span>
              ) : null}
            </div>

            {cliente.cnpj ? (
              <p className="text-xs text-slate-500">
                CNPJ {formatCNPJ(cliente.cnpj)}
              </p>
            ) : null}

            {metaParts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {cliente.segmento ? (
                  <span className="inline-flex items-center gap-1">
                    <Tag size={12} className="shrink-0" />
                    <span className="truncate">{cliente.segmento}</span>
                  </span>
                ) : null}
                {cliente.segmento &&
                (cliente.emailPrincipal || cliente.telefone) ? (
                  <span className="text-slate-300">•</span>
                ) : null}
                {cliente.emailPrincipal ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{cliente.emailPrincipal}</span>
                  </span>
                ) : null}
                {cliente.emailPrincipal && cliente.telefone ? (
                  <span className="text-slate-300">•</span>
                ) : null}
                {cliente.telefone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="shrink-0" />
                    <span>{formatPhone(cliente.telefone)}</span>
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                {cliente._count.vagas}{" "}
                {cliente._count.vagas === 1 ? "vaga no total" : "vagas no total"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
