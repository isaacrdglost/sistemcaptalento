import Link from "next/link";
import { FileText, Linkedin } from "lucide-react";
import type { Senioridade } from "@prisma/client";
import { getInitials } from "@/lib/format";
import { formatDateBR } from "@/lib/business-days";

export interface TalentoCardData {
  id: string;
  nome: string;
  email: string | null;
  senioridade: Senioridade | null;
  area: string | null;
  cidade: string | null;
  estado: string | null;
  tags: string[];
  linkCV: string | null;
  cvArquivoUrl: string | null;
  linkedinUrl: string | null;
  ativo: boolean;
  createdAt: Date;
  candidatosCount: number;
}

const SENIORIDADE_LABEL: Record<Senioridade, string> = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  lideranca: "Liderança",
};

interface TalentoCardProps {
  talento: TalentoCardData;
}

export function TalentoCard({ talento }: TalentoCardProps) {
  const cidadeEstado = [talento.cidade, talento.estado]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" / ");

  const temCV = Boolean(talento.cvArquivoUrl || talento.linkCV);
  const temLinkedin = Boolean(talento.linkedinUrl);

  const visibleTags = talento.tags.slice(0, 4);
  const restoTags = Math.max(0, talento.tags.length - visibleTags.length);

  return (
    <Link
      href={`/talentos/${talento.id}`}
      className="card-interactive flex flex-col gap-3 p-5"
    >
      {!talento.ativo ? (
        <div>
          <span className="badge-slate">Arquivado</span>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            talento.ativo
              ? "bg-gradient-royal text-white"
              : "bg-slate-200 text-slate-600"
          }`}
          aria-hidden
        >
          {getInitials(talento.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">
            {talento.nome}
          </h3>
          {talento.email ? (
            <p className="truncate text-xs text-slate-500">{talento.email}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-royal">
          {temCV ? (
            <FileText size={14} aria-label="Possui currículo" />
          ) : null}
          {temLinkedin ? (
            <Linkedin size={14} aria-label="Possui LinkedIn" />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {talento.senioridade ? (
          <span className="badge-royal">
            {SENIORIDADE_LABEL[talento.senioridade]}
          </span>
        ) : null}
        {talento.area ? (
          <span className="badge-slate">{talento.area}</span>
        ) : null}
        {cidadeEstado ? (
          <span className="badge-slate">{cidadeEstado}</span>
        ) : null}
      </div>

      {visibleTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
          {restoTags > 0 ? (
            <span className="text-xs text-slate-400">
              +{restoTags}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>Cadastrado em {formatDateBR(talento.createdAt)}</span>
        <span>
          {talento.candidatosCount}{" "}
          {talento.candidatosCount === 1 ? "candidatura" : "candidaturas"}
        </span>
      </div>
    </Link>
  );
}
