"use client";

import { FileText, Mail } from "lucide-react";

interface TermoButtonProps {
  contratacaoId: string;
  clienteEmail: string | null;
}

export function TermoButton({
  contratacaoId,
  clienteEmail,
}: TermoButtonProps) {
  const termoUrl = `/contratacoes/${contratacaoId}/termo`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={termoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
      >
        <FileText size={12} />
        Ver termo de contratação
      </a>
      {clienteEmail ? (
        <a
          href={buildMailto(clienteEmail, termoUrl)}
          className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
        >
          <Mail size={12} />
          Enviar pro cliente
        </a>
      ) : null}
    </div>
  );
}

function buildMailto(email: string, termoUrl: string): string {
  const subject = encodeURIComponent(
    "Termo de Contratação — CapTalento RH",
  );
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${termoUrl}`
      : termoUrl;
  const body = encodeURIComponent(
    `Olá,\n\nSegue o termo da contratação com a confirmação dos dados acordados e as condições da garantia de 30 dias.\n\nLink: ${fullUrl}\n\nQualquer ajuste é só responder esse email.\n\nAtenciosamente,\nCapTalento RH`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
