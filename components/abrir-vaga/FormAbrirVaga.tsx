"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------- */
/* Helpers inline                                                           */
/* ----------------------------------------------------------------------- */

/**
 * Aplica máscara progressiva `(00) 00000-0000` em telefone BR. Mantém só
 * os dígitos, limita em 11 (DDD + 9 dígitos) e formata conforme o tamanho
 * — formato curto pra fixo (10 dígitos), formato longo pra celular (11).
 *
 * Cópia da implementação que vive em `LeadInfoForm`/`ClienteInfoForm`/
 * `TalentoInfoForm` — replicada aqui pra manter o componente público
 * autocontido (briefing pediu helpers inline).
 */
function maskPhone(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Regex pragmática pra email — valida formato, não existência. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ----------------------------------------------------------------------- */
/* Tipos                                                                    */
/* ----------------------------------------------------------------------- */

type Step = 1 | 2 | "ok" | "erro";

type Senioridade =
  | ""
  | "estagio"
  | "junior"
  | "pleno"
  | "senior"
  | "especialista"
  | "lideranca";

type Volume = "" | "uma_vaga" | "duas_a_cinco" | "seis_a_dez" | "mais_de_dez";

type Urgencia = "" | "imediata" | "ate_30d" | "ate_60d" | "sem_prazo";

type Modalidade = "" | "clt" | "pj" | "autonomo" | "estagio" | "misto";

type Agencia = "" | "sim" | "nao" | "nao_sei";

interface FormState {
  // Step 1
  empresa: string;
  segmento: string;
  contato: string;
  contatoCargo: string;
  email: string;
  telefone: string;
  // Step 2
  cargoInteresse: string;
  senioridade: Senioridade;
  volumeVagas: Volume;
  urgencia: Urgencia;
  orcamento: string;
  modalidade: Modalidade;
  jaTrabalhouComAgencia: Agencia;
  mensagem: string;
  // Honeypot — fica invisível, só bots preenchem
  website: string;
}

const INITIAL: FormState = {
  empresa: "",
  segmento: "",
  contato: "",
  contatoCargo: "",
  email: "",
  telefone: "",
  cargoInteresse: "",
  senioridade: "",
  volumeVagas: "",
  urgencia: "",
  orcamento: "",
  modalidade: "",
  jaTrabalhouComAgencia: "",
  mensagem: "",
  website: "",
};

/* Opções dos selects ----------------------------------------------------- */

const SENIORIDADE_OPTS: SelectOption[] = [
  { value: "estagio", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "lideranca", label: "Liderança" },
];

const VOLUME_OPTS: SelectOption[] = [
  { value: "uma_vaga", label: "1 vaga" },
  { value: "duas_a_cinco", label: "2 a 5 vagas" },
  { value: "seis_a_dez", label: "6 a 10 vagas" },
  { value: "mais_de_dez", label: "Mais de 10 vagas" },
];

const URGENCIA_OPTS: SelectOption[] = [
  { value: "imediata", label: "Imediata" },
  { value: "ate_30d", label: "Até 30 dias" },
  { value: "ate_60d", label: "Até 60 dias" },
  { value: "sem_prazo", label: "Sem prazo definido" },
];

const MODALIDADE_OPTS: SelectOption[] = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "autonomo", label: "Autônomo" },
  { value: "estagio", label: "Estágio" },
  { value: "misto", label: "Misto / aberto" },
];

/* ----------------------------------------------------------------------- */
/* Componente principal                                                     */
/* ----------------------------------------------------------------------- */

export function FormAbrirVaga() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Captura UTMs do query string. Não muda durante a sessão, então memo
  // resolve uma vez e reusa.
  const utms = useMemo(() => {
    return {
      utmSource: searchParams.get("utm_source") ?? undefined,
      utmMedium: searchParams.get("utm_medium") ?? undefined,
      utmCampaign: searchParams.get("utm_campaign") ?? undefined,
    };
  }, [searchParams]);

  const step1Valid =
    data.empresa.trim().length >= 2 &&
    data.contato.trim().length >= 2 &&
    (EMAIL_RE.test(data.email.trim()) || data.telefone.trim().length > 0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleAdvance() {
    if (!step1Valid) return;
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");

    // Monta payload — só inclui campos preenchidos pra não enviar strings
    // vazias que o Zod do backend interpretaria como invalidas pros enums.
    const payload: Record<string, unknown> = {
      empresa: data.empresa.trim(),
      contato: data.contato.trim() || undefined,
      contatoCargo: data.contatoCargo.trim() || undefined,
      segmento: data.segmento.trim() || undefined,
      email: data.email.trim() || undefined,
      telefone: data.telefone.trim() || undefined,
      cargoInteresse: data.cargoInteresse.trim() || undefined,
      senioridade: data.senioridade || undefined,
      volumeVagas: data.volumeVagas || undefined,
      urgencia: data.urgencia || undefined,
      orcamento: data.orcamento.trim() || undefined,
      modalidade: data.modalidade || undefined,
      jaTrabalhouComAgencia:
        data.jaTrabalhouComAgencia === "sim"
          ? true
          : data.jaTrabalhouComAgencia === "nao"
            ? false
            : undefined,
      mensagem: data.mensagem.trim() || undefined,
      origem: "site",
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      website: data.website || undefined, // honeypot — bots preenchem
    };

    // Remove chaves undefined pra payload limpo (apenas estético)
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k],
    );

    try {
      const res = await fetch("/api/leads/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let body: { ok?: boolean; error?: string } = {};
      try {
        body = await res.json();
      } catch {
        // Se o backend devolver corpo vazio (raro mas pode acontecer em
        // erros de infra), seguimos com objeto vazio
      }

      if (res.ok && body.ok) {
        setStep("ok");
      } else {
        setErrorMsg(
          body.error ??
            (res.status === 429
              ? "Muitas tentativas — aguarde alguns minutos e tente de novo."
              : "Não foi possível enviar agora. Tente novamente em instantes."),
        );
        setStep("erro");
      }
    } catch {
      setErrorMsg(
        "Falha de conexão. Verifique sua internet e tente novamente.",
      );
      setStep("erro");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setErrorMsg("");
    setStep(1);
  }

  /* --- Estado "ok" -------------------------------------------------- */
  if (step === "ok") {
    return (
      <div className="card p-6 sm:p-10 animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2
            size={64}
            strokeWidth={1.75}
            className="text-lima"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Recebemos sua solicitação!
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm text-slate-600 sm:text-base">
            Em breve um especialista da CapTalento RH vai entrar em contato
            pelo WhatsApp ou email pra entender melhor sua necessidade e
            apresentar a melhor proposta.
          </p>

          <ol className="mt-8 grid w-full max-w-lg gap-3 text-left">
            <NextStepItem n={1} text="Diagnóstico rápido por WhatsApp" />
            <NextStepItem n={2} text="Proposta personalizada por email" />
            <NextStepItem n={3} text="Início do processo de busca" />
          </ol>

          <a
            href="https://rhcaptalento.com.br"
            className="btn-primary btn-lg mt-8"
          >
            Voltar para o site
          </a>
        </div>
      </div>
    );
  }

  /* --- Estado "erro" ------------------------------------------------ */
  if (step === "erro") {
    return (
      <div className="card p-6 sm:p-10 animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle
            size={56}
            strokeWidth={1.75}
            className="text-amber-500"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            Algo deu errado
          </h1>
          <p className="mt-3 max-w-md text-pretty text-sm text-slate-600">
            {errorMsg ||
              "Não conseguimos enviar sua solicitação agora. Tente novamente em instantes."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="btn-primary mt-6"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  /* --- Form (steps 1 e 2) ------------------------------------------ */
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card p-6 sm:p-8 animate-fade-in-up"
    >
      <StepIndicator step={step} />

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            <Step1Fields data={data} update={update} />

            <div className="mt-8 flex items-center justify-end">
              <button
                type="button"
                onClick={handleAdvance}
                disabled={!step1Valid}
                className="btn-primary btn-lg"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            <Step2Fields data={data} update={update} />

            {/* Honeypot — invisível pra humanos, atrai bots. NÃO tem
                <label> visível, fica fora do tab order, oculto via sr-only. */}
            <div aria-hidden="true" className="sr-only">
              <label htmlFor="website-hp">
                Não preencher (campo anti-spam)
              </label>
              <input
                id="website-hp"
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                value={data.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="btn-secondary"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary btn-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Subcomponentes locais                                                    */
/* ----------------------------------------------------------------------- */

function StepIndicator({ step }: { step: 1 | 2 }) {
  const titles: Record<1 | 2, string> = {
    1: "Sobre você",
    2: "Sobre a vaga",
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2" aria-hidden="true">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
            "bg-royal text-white",
          )}
        >
          1
        </span>
        <span
          className={cn(
            "h-px flex-1 transition-colors",
            step === 2 ? "bg-royal" : "bg-line",
          )}
        />
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
            step === 2
              ? "bg-royal text-white"
              : "bg-slate-100 text-slate-500",
          )}
        >
          2
        </span>
      </div>
      <p className="section-label">
        Passo {step} de 2 · {titles[step]}
      </p>
    </div>
  );
}

interface FieldsProps {
  data: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

function Step1Fields({ data, update }: FieldsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Vamos abrir sua vaga
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Conte rapidamente sobre sua empresa e o melhor jeito de a gente
          falar com você.
        </p>
      </div>

      <div>
        <label htmlFor="av-empresa" className="label">
          Empresa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="av-empresa"
          type="text"
          required
          aria-required="true"
          autoComplete="organization"
          className="input"
          placeholder="Nome da sua empresa"
          value={data.empresa}
          onChange={(e) => update("empresa", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="av-segmento" className="label">
          Segmento
        </label>
        <input
          id="av-segmento"
          type="text"
          className="input"
          placeholder="Tech, Saúde, Varejo…"
          value={data.segmento}
          onChange={(e) => update("segmento", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="av-contato" className="label">
            Seu nome <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="av-contato"
            type="text"
            required
            aria-required="true"
            autoComplete="name"
            className="input"
            placeholder="Como podemos te chamar?"
            value={data.contato}
            onChange={(e) => update("contato", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="av-cargo" className="label">
            Seu cargo
          </label>
          <input
            id="av-cargo"
            type="text"
            autoComplete="organization-title"
            className="input"
            placeholder="Diretor de RH, Founder…"
            value={data.contatoCargo}
            onChange={(e) => update("contatoCargo", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="av-email" className="label">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="av-email"
            type="email"
            required
            aria-required="true"
            autoComplete="email"
            inputMode="email"
            className="input"
            placeholder="voce@empresa.com"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="av-telefone" className="label">
            Telefone <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="av-telefone"
            type="tel"
            required
            aria-required="true"
            autoComplete="tel"
            inputMode="tel"
            className="input"
            placeholder="(00) 00000-0000"
            value={data.telefone}
            onChange={(e) => update("telefone", maskPhone(e.target.value))}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        * Email ou telefone é obrigatório — pode preencher os dois pra
        agilizar.
      </p>
    </div>
  );
}

function Step2Fields({ data, update }: FieldsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          A vaga em si
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tudo é opcional, mas quanto mais detalhe, mais rápida e precisa
          fica nossa proposta.
        </p>
      </div>

      <div>
        <label htmlFor="av-cargo-interesse" className="label">
          Cargo que precisa contratar
        </label>
        <input
          id="av-cargo-interesse"
          type="text"
          className="input"
          placeholder="Ex.: Engenheiro de Dados Pleno"
          value={data.cargoInteresse}
          onChange={(e) => update("cargoInteresse", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="av-senioridade" className="label">
            Senioridade
          </label>
          <Select
            id="av-senioridade"
            value={data.senioridade}
            onChange={(v) => update("senioridade", v as Senioridade)}
            options={SENIORIDADE_OPTS}
            placeholder="Selecionar…"
            ariaLabel="Senioridade"
          />
        </div>

        <div>
          <label htmlFor="av-volume" className="label">
            Volume
          </label>
          <Select
            id="av-volume"
            value={data.volumeVagas}
            onChange={(v) => update("volumeVagas", v as Volume)}
            options={VOLUME_OPTS}
            placeholder="Selecionar…"
            ariaLabel="Volume de vagas"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="av-urgencia" className="label">
            Urgência
          </label>
          <Select
            id="av-urgencia"
            value={data.urgencia}
            onChange={(v) => update("urgencia", v as Urgencia)}
            options={URGENCIA_OPTS}
            placeholder="Selecionar…"
            ariaLabel="Urgência"
          />
        </div>

        <div>
          <label htmlFor="av-modalidade" className="label">
            Modalidade
          </label>
          <Select
            id="av-modalidade"
            value={data.modalidade}
            onChange={(v) => update("modalidade", v as Modalidade)}
            options={MODALIDADE_OPTS}
            placeholder="Selecionar…"
            ariaLabel="Modalidade de contratação"
          />
        </div>
      </div>

      <div>
        <label htmlFor="av-orcamento" className="label">
          Faixa salarial / orçamento
        </label>
        <input
          id="av-orcamento"
          type="text"
          className="input"
          placeholder="Ex.: R$ 8 a 12 mil + benefícios"
          value={data.orcamento}
          onChange={(e) => update("orcamento", e.target.value)}
        />
      </div>

      <fieldset>
        <legend className="label">
          Já trabalhou com agência de RH antes?
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(
            [
              { value: "sim", label: "Sim" },
              { value: "nao", label: "Não" },
              { value: "nao_sei", label: "Não sei" },
            ] as const
          ).map((opt) => {
            const active = data.jaTrabalhouComAgencia === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  update("jaTrabalhouComAgencia", opt.value as Agencia)
                }
                className={cn("chip", active && "chip-active")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="av-mensagem" className="label">
          Mensagem (opcional)
        </label>
        <textarea
          id="av-mensagem"
          className="input min-h-[112px] resize-y"
          placeholder="Algum detalhe importante? Skills específicas, contexto do time, deal-breakers…"
          value={data.mensagem}
          onChange={(e) => update("mensagem", e.target.value)}
        />
      </div>
    </div>
  );
}

function NextStepItem({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line/70 bg-white px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-royal-50 text-xs font-bold text-royal-700">
        {n}
      </span>
      <span className="text-sm text-ink">{text}</span>
    </li>
  );
}
