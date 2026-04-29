"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { criarCliente } from "@/app/clientes/actions";

interface NovoClienteModalProps {
  /** Texto do botão que abre o modal. Default: "+ Novo cliente". */
  triggerLabel?: string;
  /** Classe do botão. Default: btn-primary. */
  triggerClassName?: string;
}

interface FormState {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  contatoResponsavel: string;
  emailPrincipal: string;
  telefone: string;
  segmento: string;
  obs: string;
}

const EMPTY: FormState = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  contatoResponsavel: "",
  emailPrincipal: "",
  telefone: "",
  segmento: "",
  obs: "",
};

function maskCNPJ(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 14);
  let out = d;
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length > 5) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 8)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 12)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
      8,
      12,
    )}-${d.slice(12)}`;
  return out;
}

function maskPhone(value: string): string {
  const d = value.replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function NovoClienteModal({
  triggerLabel = "+ Novo cliente",
  triggerClassName = "btn-primary",
}: NovoClienteModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isPending) setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isPending]);

  function reset() {
    setForm(EMPTY);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const razao = form.razaoSocial.trim();
    if (!razao) {
      toast.error("Razão social é obrigatória");
      return;
    }

    const payload = {
      razaoSocial: razao,
      nomeFantasia: form.nomeFantasia.trim() || null,
      cnpj: form.cnpj.trim() || null,
      contatoResponsavel: form.contatoResponsavel.trim() || null,
      emailPrincipal: form.emailPrincipal.trim() || null,
      telefone: form.telefone.trim() || null,
      segmento: form.segmento.trim() || null,
      obs: form.obs.trim() || null,
    };

    startTransition(async () => {
      const result = await criarCliente(payload);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Cliente cadastrado");
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <Plus size={16} className="shrink-0" />
        <span>{triggerLabel.replace(/^\+\s*/, "")}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="novo-cliente-title"
              className="relative w-full max-w-lg rounded-2xl bg-white shadow-pop max-h-[90vh] flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                aria-label="Fechar"
                onClick={handleClose}
                className="absolute right-3 top-3 z-10 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-3 border-b border-line/70 p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600 ring-1 ring-inset ring-royal-100">
                  <Building2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="section-label mb-0.5">CRM</div>
                  <h2
                    id="novo-cliente-title"
                    className="text-h3 text-ink"
                  >
                    Novo cliente
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Cadastre um cliente para associar às próximas vagas.
                  </p>
                </div>
              </div>

              <div className="relative flex-1 overflow-y-auto">
                <div
                  aria-hidden
                  className="pointer-events-none sticky top-0 -mb-6 h-6 bg-gradient-to-b from-white to-transparent z-[1]"
                />
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 p-6"
              >
                <div>
                  <label htmlFor="razaoSocial" className="label">
                    Razão social <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="razaoSocial"
                    ref={firstFieldRef}
                    type="text"
                    value={form.razaoSocial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, razaoSocial: e.target.value }))
                    }
                    disabled={isPending}
                    required
                    className="input"
                    placeholder="Empresa LTDA"
                  />
                </div>

                <div>
                  <label htmlFor="nomeFantasia" className="label">
                    Nome fantasia
                  </label>
                  <input
                    id="nomeFantasia"
                    type="text"
                    value={form.nomeFantasia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nomeFantasia: e.target.value }))
                    }
                    disabled={isPending}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cnpj" className="label">
                      CNPJ
                    </label>
                    <input
                      id="cnpj"
                      type="text"
                      value={form.cnpj}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cnpj: maskCNPJ(e.target.value),
                        }))
                      }
                      disabled={isPending}
                      inputMode="numeric"
                      placeholder="00.000.000/0000-00"
                      className="input"
                    />
                  </div>
                  <div>
                    <label htmlFor="segmento" className="label">
                      Segmento
                    </label>
                    <input
                      id="segmento"
                      type="text"
                      value={form.segmento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, segmento: e.target.value }))
                      }
                      disabled={isPending}
                      placeholder="Tech, Saúde, Varejo…"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contatoResponsavel" className="label">
                    Contato responsável
                  </label>
                  <input
                    id="contatoResponsavel"
                    type="text"
                    value={form.contatoResponsavel}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contatoResponsavel: e.target.value,
                      }))
                    }
                    disabled={isPending}
                    className="input"
                    placeholder="Nome de quem atende"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="emailPrincipal" className="label">
                      Email principal
                    </label>
                    <input
                      id="emailPrincipal"
                      type="email"
                      value={form.emailPrincipal}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emailPrincipal: e.target.value,
                        }))
                      }
                      disabled={isPending}
                      className="input"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="telefone" className="label">
                      Telefone
                    </label>
                    <input
                      id="telefone"
                      type="tel"
                      value={form.telefone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          telefone: maskPhone(e.target.value),
                        }))
                      }
                      disabled={isPending}
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="obs" className="label">
                    Observações
                  </label>
                  <textarea
                    id="obs"
                    value={form.obs}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, obs: e.target.value }))
                    }
                    disabled={isPending}
                    rows={3}
                    className="input resize-y"
                    placeholder="Notas internas, preferências, histórico…"
                  />
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary"
                  >
                    {isPending ? "Cadastrando…" : "Cadastrar cliente"}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
