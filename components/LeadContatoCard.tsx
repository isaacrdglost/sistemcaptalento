import {
  Building2,
  Globe,
  Linkedin,
  Mail,
  Phone,
  User,
} from "lucide-react";
import type { Lead } from "@prisma/client";
import { formatCNPJ } from "@/lib/format";
import { descricaoOrigemLead } from "@/lib/activity-lead";

interface LeadContatoCardProps {
  lead: Lead;
}

interface LinhaProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function Linha({ icon, label, children }: LinhaProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

export function LeadContatoCard({ lead }: LeadContatoCardProps) {
  const origemLabel = lead.origemDescricao
    ? `${descricaoOrigemLead(lead.origem)} — ${lead.origemDescricao}`
    : descricaoOrigemLead(lead.origem);

  return (
    <section className="card p-6">
      <div className="mb-5">
        <div className="section-label mb-1">Contato</div>
        <h2 className="text-h3 text-ink">Quem está conversando</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Linha icon={<User size={14} />} label="Contato">
          {lead.contatoNome ? (
            <>
              <span>{lead.contatoNome}</span>
              {lead.contatoCargo ? (
                <span className="ml-1 text-slate-500">
                  · {lead.contatoCargo}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Linha>

        <Linha icon={<Building2 size={14} />} label="Empresa">
          {lead.razaoSocial}
          {lead.cnpj ? (
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">
              {formatCNPJ(lead.cnpj)}
            </div>
          ) : null}
        </Linha>

        <Linha icon={<Mail size={14} />} label="Email">
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="text-royal-700 transition hover:underline"
            >
              {lead.email}
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Linha>

        <Linha icon={<Phone size={14} />} label="Telefone">
          {lead.telefone ? (
            <span>{lead.telefone}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Linha>

        <Linha icon={<Globe size={14} />} label="Site">
          {lead.site ? (
            <a
              href={lead.site}
              target="_blank"
              rel="noopener noreferrer"
              className="text-royal-700 transition hover:underline"
            >
              {lead.site}
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Linha>

        <Linha icon={<Linkedin size={14} />} label="LinkedIn">
          {lead.linkedinUrl ? (
            <a
              href={lead.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-royal-700 transition hover:underline"
            >
              {lead.linkedinUrl}
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Linha>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="section-label mb-1.5">Origem</div>
          <span className="badge-slate">{origemLabel}</span>
          {lead.segmento ? (
            <span className="ml-2 badge bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200">
              {lead.segmento}
            </span>
          ) : null}
        </div>
      </div>

      {lead.mensagem ? (
        <div className="mt-6 border-t border-line/70 pt-4">
          <div className="section-label mb-1.5">Mensagem inicial</div>
          <p className="whitespace-pre-line text-sm text-slate-700">
            {lead.mensagem}
          </p>
        </div>
      ) : null}

      {lead.obs ? (
        <div className="mt-4 rounded-xl bg-amber-50/50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Observações internas
          </div>
          <p className="mt-1 whitespace-pre-line">{lead.obs}</p>
        </div>
      ) : null}
    </section>
  );
}
