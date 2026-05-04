"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  TemplateFormModal,
  type CanalTemplate,
  type TemplateEditavel,
} from "@/components/TemplateFormModal";
import {
  atualizarTemplate,
  excluirTemplate,
} from "@/app/admin/templates-actions";

interface TemplateSectionProps {
  canal: CanalTemplate;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  templates: TemplateEditavel[];
}

interface ModalState {
  open: boolean;
  template?: TemplateEditavel;
}

export function TemplateSection({
  canal,
  titulo,
  descricao,
  icone: Icone,
  templates,
}: TemplateSectionProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function abrirNovo() {
    setModal({ open: true, template: undefined });
  }

  function abrirEdicao(t: TemplateEditavel) {
    setModal({ open: true, template: t });
  }

  function fecharModal() {
    setModal({ open: false });
  }

  function handleToggleAtivo(t: TemplateEditavel) {
    setPendingId(t.id);
    startTransition(async () => {
      const result = await atualizarTemplate(t.id, {
        nome: t.nome,
        canal: t.canal,
        assunto: t.assunto,
        corpo: t.corpo,
        ordem: t.ordem,
        ativo: !t.ativo,
      });
      setPendingId(null);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t.ativo ? "Template desativado" : "Template ativado");
      router.refresh();
    });
  }

  async function handleExcluir(t: TemplateEditavel) {
    const ok = await confirm({
      title: "Excluir template",
      message: `Tem certeza que quer excluir "${t.nome}"? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setPendingId(t.id);
    startTransition(async () => {
      const result = await excluirTemplate(t.id);
      setPendingId(null);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Template excluído");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-royal-50 text-royal-600">
            <Icone size={16} />
          </span>
          <div>
            <h2 className="text-h3 text-ink">{titulo}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={abrirNovo}
          className="btn-primary btn-sm"
        >
          <Plus size={14} />
          <span>Novo template</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          Nenhum template de {titulo.toLowerCase()} cadastrado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t, i) => {
            const linhaPending = pendingId === t.id && isPending;
            return (
              <div
                key={t.id}
                className="card animate-fade-in-up p-4"
                style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">
                        {t.nome}
                      </h3>
                      <span
                        className={
                          t.canal === "whatsapp"
                            ? "badge-green"
                            : "badge-royal"
                        }
                      >
                        {t.canal === "whatsapp" ? "WhatsApp" : "Email"}
                      </span>
                      {t.ativo ? (
                        <span className="badge-lima">Ativo</span>
                      ) : (
                        <span className="badge-slate">Inativo</span>
                      )}
                      <span className="text-xs text-slate-400">
                        ordem {t.ordem}
                      </span>
                    </div>
                    {t.canal === "email" && t.assunto ? (
                      <div className="mt-1 truncate text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">
                          Assunto:{" "}
                        </span>
                        {t.assunto}
                      </div>
                    ) : null}
                    <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">
                      {t.corpo}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(t)}
                      disabled={linhaPending}
                      className="btn-ghost text-xs"
                      title="Editar template"
                    >
                      <Pencil size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(t)}
                      disabled={linhaPending}
                      className="btn-ghost text-xs"
                      title={t.ativo ? "Desativar" : "Ativar"}
                    >
                      {t.ativo ? (
                        <PowerOff size={13} />
                      ) : (
                        <Power size={13} />
                      )}
                      <span>{t.ativo ? "Desativar" : "Ativar"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(t)}
                      disabled={linhaPending}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Excluir template"
                      aria-label="Excluir template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TemplateFormModal
        open={modal.open}
        onClose={fecharModal}
        template={modal.template}
        canalDefault={canal}
      />
    </section>
  );
}
