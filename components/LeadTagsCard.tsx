"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import type { Lead } from "@prisma/client";
import { atualizarLead, type LeadInput } from "@/app/comercial/actions";
import { cn } from "@/lib/utils";

interface LeadTagsCardProps {
  lead: Lead;
  podeAgir: boolean;
}

function leadToBaseInput(lead: Lead): LeadInput {
  return {
    razaoSocial: lead.razaoSocial,
    nomeFantasia: lead.nomeFantasia,
    cnpj: lead.cnpj,
    segmento: lead.segmento,
    site: lead.site,
    contatoNome: lead.contatoNome,
    contatoCargo: lead.contatoCargo,
    email: lead.email,
    telefone: lead.telefone,
    linkedinUrl: lead.linkedinUrl,
    mensagem: lead.mensagem,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    origem: lead.origem,
    origemDescricao: lead.origemDescricao,
    obs: lead.obs,
    tags: lead.tags ?? [],
    cargoInteresse: lead.cargoInteresse,
    senioridadeBuscada: lead.senioridadeBuscada,
    volumeVagas: lead.volumeVagas,
    urgencia: lead.urgencia,
    orcamento: lead.orcamento,
    modalidade: lead.modalidade,
    jaTrabalhouComAgencia: lead.jaTrabalhouComAgencia,
  };
}

export function LeadTagsCard({ lead, podeAgir }: LeadTagsCardProps) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(lead.tags ?? []);
  const [input, setInput] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const carregouSugestoes = useRef(false);

  useEffect(() => {
    setTags(lead.tags ?? []);
  }, [lead.id, lead.tags]);

  // Carrega sugestões na primeira interação (lazy)
  async function carregarSugestoes() {
    if (carregouSugestoes.current) return;
    carregouSugestoes.current = true;
    try {
      const res = await fetch("/api/leads/tags");
      if (!res.ok) return;
      const data = (await res.json()) as { tags?: string[] };
      setSugestoes(data.tags ?? []);
    } catch {
      // silencioso — autocomplete é nice-to-have
    }
  }

  useEffect(() => {
    if (!showSugestoes) return;
    function onMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showSugestoes]);

  function persistir(novas: string[]) {
    const base = leadToBaseInput(lead);
    startTransition(async () => {
      const result = await atualizarLead(lead.id, { ...base, tags: novas });
      if ("error" in result) {
        toast.error(result.error);
        // reverte UI
        setTags(lead.tags ?? []);
        return;
      }
      toast.success("Tags atualizadas");
      router.refresh();
    });
  }

  function adicionar(rawTag: string) {
    const tag = rawTag.trim();
    if (!tag) return;
    if (tag.length > 40) {
      toast.error("Tag muito longa (máx 40 caracteres)");
      return;
    }
    if (tags.length >= 20) {
      toast.error("Máximo de 20 tags por lead");
      return;
    }
    if (
      tags.some(
        (t) => t.toLowerCase() === tag.toLowerCase(),
      )
    ) {
      setInput("");
      return;
    }
    const novas = [...tags, tag];
    setTags(novas);
    setInput("");
    persistir(novas);
  }

  function remover(tag: string) {
    if (!podeAgir) return;
    const novas = tags.filter((t) => t !== tag);
    setTags(novas);
    persistir(novas);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault();
      remover(tags[tags.length - 1]);
    }
  }

  const sugestoesFiltradas = sugestoes
    .filter(
      (s) =>
        !tags.some((t) => t.toLowerCase() === s.toLowerCase()) &&
        (input.trim().length === 0 ||
          s.toLowerCase().includes(input.trim().toLowerCase())),
    )
    .slice(0, 8);

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Tag size={14} className="text-slate-400" />
        <div className="section-label">Tags</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && !podeAgir ? (
          <span className="text-xs text-slate-400">Sem tags.</span>
        ) : null}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            {tag}
            {podeAgir ? (
              <button
                type="button"
                onClick={() => remover(tag)}
                disabled={isPending}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40"
                aria-label={`Remover tag ${tag}`}
              >
                <X size={10} />
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {podeAgir ? (
        <div ref={wrapperRef} className="relative mt-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              void carregarSugestoes();
              setShowSugestoes(true);
            }}
            disabled={isPending}
            placeholder="Adicione uma tag e pressione Enter"
            className="input"
          />
          {showSugestoes && sugestoesFiltradas.length > 0 ? (
            <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-line/70 bg-white shadow-lg">
              <div className="border-b border-line/70 px-3 py-1.5">
                <span className="section-label">Sugestões</span>
              </div>
              <ul className="max-h-48 overflow-y-auto p-1">
                {sugestoesFiltradas.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        adicionar(s);
                        setShowSugestoes(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50",
                      )}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-1.5 text-[10px] text-slate-400">
            Enter ou vírgula adiciona. Backspace remove a última.
          </p>
        </div>
      ) : null}
    </section>
  );
}
