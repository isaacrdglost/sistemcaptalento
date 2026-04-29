"use client";

import Link from "next/link";
import { Mail, Phone, Tag } from "lucide-react";
import { formatCNPJ, formatPhone } from "@/lib/format";
import { formatRelative } from "@/lib/business-days";
import { Avatar } from "@/components/ui/Avatar";
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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {clientes.map((cliente, i) => {
        return (
          <Link
            key={cliente.id}
            href={`/clientes/${cliente.id}`}
            className={`card-interactive flex flex-col gap-3 p-5 animate-fade-in-up ${
              !cliente.ativo ? "opacity-60" : ""
            }`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex items-start gap-3">
              <Avatar
                nome={cliente.razaoSocial}
                size="md"
                gradient={cliente.ativo}
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-h3 text-ink">
                  {cliente.razaoSocial}
                </h3>
                {cliente.nomeFantasia ? (
                  <p className="truncate text-sm text-slate-500">
                    {cliente.nomeFantasia}
                  </p>
                ) : null}
              </div>
              <span
                className={`badge-dot shrink-0 ${
                  cliente.vagasAbertas > 0
                    ? "bg-lima-50 text-lima-700 ring-lima-100"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
              >
                {cliente._count.vagas}{" "}
                {cliente._count.vagas === 1 ? "vaga" : "vagas"}
              </span>
            </div>

            {!cliente.ativo ? (
              <div>
                <span className="badge-slate">Arquivado</span>
              </div>
            ) : null}

            {cliente.cnpj ? (
              <p className="text-xs text-slate-500">
                CNPJ {formatCNPJ(cliente.cnpj)}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              {cliente.segmento ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <Tag size={11} className="shrink-0" />
                  <span className="truncate max-w-[10rem]">
                    {cliente.segmento}
                  </span>
                </span>
              ) : null}
              {cliente.emailPrincipal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate max-w-[12rem]">
                    {cliente.emailPrincipal}
                  </span>
                </span>
              ) : null}
              {cliente.telefone ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <Phone size={11} className="shrink-0" />
                  <span>{formatPhone(cliente.telefone)}</span>
                </span>
              ) : null}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-line/70 pt-3 text-xs text-slate-500">
              <span>Cadastrado {formatRelative(cliente.createdAt)}</span>
              {cliente.vagasAbertas > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-lima-700 font-medium">
                  <span className="dot bg-lima-500" />
                  {cliente.vagasAbertas}{" "}
                  {cliente.vagasAbertas === 1 ? "aberta" : "abertas"}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
