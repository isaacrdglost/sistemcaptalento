"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type {
  Lead,
  ModalidadeContratacao,
  Senioridade,
  UrgenciaContratacao,
  VolumeVagas,
} from "@prisma/client";
import { atualizarLead, type LeadInput } from "@/app/comercial/actions";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

interface LeadQualificacaoFormProps {
  lead: Lead;
  podeAgir: boolean;
}

const SENIORIDADE_OPCOES: { value: Senioridade; label: string }[] = [
  { value: "estagio", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "lideranca", label: "Liderança" },
];

const VOLUME_OPCOES: { value: VolumeVagas; label: string }[] = [
  { value: "uma_vaga", label: "1 vaga" },
  { value: "duas_a_cinco", label: "2 a 5" },
  { value: "seis_a_dez", label: "6 a 10" },
  { value: "mais_de_dez", label: "Mais de 10" },
];

const URGENCIA_OPCOES: { value: UrgenciaContratacao; label: string }[] = [
  { value: "imediata", label: "Imediata" },
  { value: "ate_30d", label: "Até 30 dias" },
  { value: "ate_60d", label: "Até 60 dias" },
  { value: "sem_prazo", label: "Sem prazo definido" },
];

const MODALIDADE_OPCOES: { value: ModalidadeContratacao; label: string }[] = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "autonomo", label: "Autônomo" },
  { value: "estagio", label: "Estágio" },
  { value: "misto", label: "Misto/aberto" },
];

interface FormState {
  cargoInteresse: string;
  senioridadeBuscada: Senioridade | "";
  volumeVagas: VolumeVagas | "";
  urgencia: UrgenciaContratacao | "";
  orcamento: string;
  modalidade: ModalidadeContratacao | "";
  jaTrabalhouComAgencia: "sim" | "nao" | "nao_informado";
}

function leadToState(lead: Lead): FormState {
  return {
    cargoInteresse: lead.cargoInteresse ?? "",
    senioridadeBuscada: lead.senioridadeBuscada ?? "",
    volumeVagas: lead.volumeVagas ?? "",
    urgencia: lead.urgencia ?? "",
    orcamento: lead.orcamento ?? "",
    modalidade: lead.modalidade ?? "",
    jaTrabalhouComAgencia:
      lead.jaTrabalhouComAgencia === true
        ? "sim"
        : lead.jaTrabalhouComAgencia === false
          ? "nao"
          : "nao_informado",
  };
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

export function LeadQualificacaoForm({
  lead,
  podeAgir,
}: LeadQualificacaoFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => leadToState(lead));
  const [initial, setInitial] = useState<FormState>(() => leadToState(lead));
  const [isPending, startTransition] = useTransition();
  const locked = !podeAgir || isPending;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (!podeAgir) return;
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const dirty = JSON.stringify(state) !== JSON.stringify(initial);

  function handleSave() {
    if (!podeAgir || isPending) return;
    const base = leadToBaseInput(lead);
    const payload: LeadInput = {
      ...base,
      cargoInteresse: state.cargoInteresse.trim() || null,
      senioridadeBuscada:
        state.senioridadeBuscada === "" ? null : state.senioridadeBuscada,
      volumeVagas: state.volumeVagas === "" ? null : state.volumeVagas,
      urgencia: state.urgencia === "" ? null : state.urgencia,
      orcamento: state.orcamento.trim() || null,
      modalidade: state.modalidade === "" ? null : state.modalidade,
      jaTrabalhouComAgencia:
        state.jaTrabalhouComAgencia === "sim"
          ? true
          : state.jaTrabalhouComAgencia === "nao"
            ? false
            : null,
    };
    startTransition(async () => {
      const result = await atualizarLead(lead.id, payload);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Qualificação salva");
      setInitial(state);
      router.refresh();
    });
  }

  function handleCancel() {
    setState(initial);
  }

  return (
    <section className="card p-6">
      <div className="mb-5">
        <div className="section-label mb-1">Qualificação</div>
        <h2 className="text-h3 text-ink">Diagnóstico da vaga</h2>
        <p className="mt-1 text-sm text-slate-500">
          {podeAgir
            ? "Edite os campos pra montar a melhor proposta."
            : "Visualizando dados em modo somente leitura."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="qual-cargo" className="label">
            Cargo de interesse
          </label>
          <input
            id="qual-cargo"
            type="text"
            value={state.cargoInteresse}
            onChange={(e) => update("cargoInteresse", e.target.value)}
            disabled={locked}
            className="input"
            placeholder="Ex.: Analista de Marketing, Dev Pleno…"
          />
        </div>

        <div>
          <label htmlFor="qual-senioridade" className="label">
            Senioridade
          </label>
          <Select
            id="qual-senioridade"
            value={state.senioridadeBuscada}
            onChange={(v) =>
              update("senioridadeBuscada", v as Senioridade | "")
            }
            disabled={locked}
            placeholder="Selecionar…"
            options={[
              { value: "", label: "Sem informação" },
              ...SENIORIDADE_OPCOES,
            ]}
          />
        </div>

        <div>
          <label htmlFor="qual-volume" className="label">
            Volume de vagas
          </label>
          <Select
            id="qual-volume"
            value={state.volumeVagas}
            onChange={(v) => update("volumeVagas", v as VolumeVagas | "")}
            disabled={locked}
            placeholder="Selecionar…"
            options={[
              { value: "", label: "Sem informação" },
              ...VOLUME_OPCOES,
            ]}
          />
        </div>

        <div>
          <label htmlFor="qual-urgencia" className="label">
            Urgência
          </label>
          <Select
            id="qual-urgencia"
            value={state.urgencia}
            onChange={(v) => update("urgencia", v as UrgenciaContratacao | "")}
            disabled={locked}
            placeholder="Selecionar…"
            options={[
              { value: "", label: "Sem informação" },
              ...URGENCIA_OPCOES,
            ]}
          />
        </div>

        <div>
          <label htmlFor="qual-modalidade" className="label">
            Modalidade
          </label>
          <Select
            id="qual-modalidade"
            value={state.modalidade}
            onChange={(v) =>
              update("modalidade", v as ModalidadeContratacao | "")
            }
            disabled={locked}
            placeholder="Selecionar…"
            options={[
              { value: "", label: "Sem informação" },
              ...MODALIDADE_OPCOES,
            ]}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="qual-orcamento" className="label">
            Orçamento / faixa salarial
          </label>
          <input
            id="qual-orcamento"
            type="text"
            value={state.orcamento}
            onChange={(e) => update("orcamento", e.target.value)}
            disabled={locked}
            className="input"
            placeholder="Ex.: R$ 6.000 a R$ 8.000 + benefícios"
          />
        </div>

        <div className="sm:col-span-2">
          <span className="label">Já trabalhou com agência de RH?</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
                { value: "nao_informado", label: "Não informado" },
              ] as const
            ).map((opt) => {
              const ativo = state.jaTrabalhouComAgencia === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("jaTrabalhouComAgencia", opt.value)}
                  disabled={locked}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    ativo
                      ? "bg-royal text-white ring-royal"
                      : "bg-white text-slate-600 ring-line hover:bg-slate-50 hover:text-ink",
                  )}
                  aria-pressed={ativo}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {podeAgir ? (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-4">
          {dirty ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="btn-ghost"
            >
              Cancelar
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending}
            className="btn-primary"
          >
            <Save size={14} />
            {isPending ? "Salvando…" : "Salvar qualificação"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
