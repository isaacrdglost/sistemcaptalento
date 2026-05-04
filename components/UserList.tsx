"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  Loader2,
  Pencil,
  PowerOff,
  Power,
  X,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";
import {
  atualizarUsuario,
  criarUsuario,
  desativarUsuario,
  reativarUsuario,
  resetarSenha,
} from "@/app/admin/actions";
import { formatDateBR } from "@/lib/business-days";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";

const ROLE_OPTIONS = [
  { value: "recruiter", label: "Recrutadora" },
  { value: "comercial", label: "Comercial" },
  { value: "admin", label: "Admin" },
];

export interface UserListItem {
  id: string;
  nome: string;
  email: string;
  role: AppRole;
  ativo: boolean;
  createdAt: Date;
}

interface UserListProps {
  users: UserListItem[];
  currentUserId: string;
}

type RowMode = "view" | "edit" | "reset";

interface EditState {
  nome: string;
  email: string;
  role: AppRole;
  ativo: boolean;
  senha: string;
}

function roleBadge(role: AppRole) {
  if (role === "admin") {
    return (
      <span className="badge-dot bg-royal-50 text-royal-700 ring-royal-100">
        Admin
      </span>
    );
  }
  if (role === "comercial") {
    return (
      <span className="badge-dot bg-amber-50 text-amber-700 ring-amber-100">
        Comercial
      </span>
    );
  }
  return (
    <span className="badge-dot bg-slate-100 text-slate-600 ring-slate-200">
      Recrutadora
    </span>
  );
}

function statusBadge(ativo: boolean) {
  if (ativo) {
    return (
      <span className="badge-dot bg-emerald-50 text-emerald-700 ring-emerald-100">
        Ativo
      </span>
    );
  }
  return (
    <span className="badge-dot bg-red-50 text-red-700 ring-red-100">
      Inativo
    </span>
  );
}

export function UserList({ users, currentUserId }: UserListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});
  const [editState, setEditState] = useState<Record<string, EditState>>({});
  const [resetState, setResetState] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [createState, setCreateState] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "recruiter" as AppRole,
  });
  const [pending, startTransition] = useTransition();

  function setMode(userId: string, mode: RowMode, user?: UserListItem) {
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    if (mode === "edit" && user) {
      setEditState((prev) => ({
        ...prev,
        [userId]: {
          nome: user.nome,
          email: user.email,
          role: user.role,
          ativo: user.ativo,
          senha: "",
        },
      }));
    }
    if (mode === "reset") {
      setResetState((prev) => ({ ...prev, [userId]: "" }));
    }
    setRowModes((prev) => ({ ...prev, [userId]: mode }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      const result = await criarUsuario({
        nome: createState.nome.trim(),
        email: createState.email.trim(),
        senha: createState.senha,
        role: createState.role,
      });
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setCreateState({
        nome: "",
        email: "",
        senha: "",
        role: "recruiter",
      });
      setShowCreate(false);
    });
  }

  function handleEditSave(userId: string) {
    const state = editState[userId];
    if (!state) return;
    setRowErrors((prev) => ({ ...prev, [userId]: null }));

    startTransition(async () => {
      const result = await atualizarUsuario(userId, {
        nome: state.nome.trim(),
        email: state.email.trim(),
        role: state.role,
        ativo: state.ativo,
        senha: state.senha.trim() ? state.senha : undefined,
      });
      if ("error" in result) {
        setRowErrors((prev) => ({ ...prev, [userId]: result.error }));
        return;
      }
      setMode(userId, "view");
    });
  }

  function handleDesativar(userId: string) {
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    startTransition(async () => {
      const result = await desativarUsuario(userId);
      if ("error" in result) {
        setRowErrors((prev) => ({ ...prev, [userId]: result.error }));
      }
    });
  }

  function handleReativar(userId: string) {
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    startTransition(async () => {
      const result = await reativarUsuario(userId);
      if ("error" in result) {
        setRowErrors((prev) => ({ ...prev, [userId]: result.error }));
      }
    });
  }

  function handleResetConfirm(userId: string) {
    const novaSenha = resetState[userId] ?? "";
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    startTransition(async () => {
      const result = await resetarSenha(userId, novaSenha);
      if ("error" in result) {
        setRowErrors((prev) => ({ ...prev, [userId]: result.error }));
        return;
      }
      setResetState((prev) => ({ ...prev, [userId]: "" }));
      setMode(userId, "view");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {users.length} {users.length === 1 ? "usuário" : "usuários"}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setCreateError(null);
            setShowCreate((v) => !v);
          }}
          disabled={pending}
        >
          {showCreate ? "Cancelar" : "Adicionar usuário"}
        </button>
      </div>

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="card p-4 flex flex-col gap-3 animate-fade-in-up"
        >
          <h3 className="text-h3 text-ink">Novo usuário</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="create-nome">
                Nome
              </label>
              <input
                id="create-nome"
                type="text"
                className="input"
                value={createState.nome}
                onChange={(e) =>
                  setCreateState((s) => ({ ...s, nome: e.target.value }))
                }
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="label" htmlFor="create-email">
                Email
              </label>
              <input
                id="create-email"
                type="email"
                className="input"
                value={createState.email}
                onChange={(e) =>
                  setCreateState((s) => ({ ...s, email: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="create-senha">
                Senha
              </label>
              <input
                id="create-senha"
                type="password"
                className="input"
                value={createState.senha}
                onChange={(e) =>
                  setCreateState((s) => ({ ...s, senha: e.target.value }))
                }
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label" htmlFor="create-role">
                Papel
              </label>
              <Select
                id="create-role"
                value={createState.role}
                onChange={(v) =>
                  setCreateState((s) => ({
                    ...s,
                    role: v as AppRole,
                  }))
                }
                options={ROLE_OPTIONS}
              />
            </div>
          </div>
          {createError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowCreate(false)}
              disabled={pending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-line/70">
            <tr className="text-eyebrow uppercase text-slate-500">
              <th className="px-4 py-3 text-left font-semibold">Usuário</th>
              <th className="px-4 py-3 text-left font-semibold">Papel</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Criado em</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {users.map((user) => {
              const mode: RowMode = rowModes[user.id] ?? "view";
              const isSelf = user.id === currentUserId;
              const error = rowErrors[user.id] ?? null;
              const edit = editState[user.id];

              if (mode === "edit" && edit) {
                return (
                  <tr
                    key={user.id}
                    className="bg-slate-50/40 align-top"
                  >
                    <td className="px-4 py-3" colSpan={2}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          className="input"
                          placeholder="Nome"
                          value={edit.nome}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [user.id]: { ...edit, nome: e.target.value },
                            }))
                          }
                        />
                        <input
                          type="email"
                          className="input"
                          placeholder="Email"
                          value={edit.email}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [user.id]: { ...edit, email: e.target.value },
                            }))
                          }
                        />
                        <Select
                          value={edit.role}
                          onChange={(v) =>
                            setEditState((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...edit,
                                role: v as AppRole,
                              },
                            }))
                          }
                          options={ROLE_OPTIONS}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs text-ink">
                        <input
                          type="checkbox"
                          className="accent-royal"
                          checked={edit.ativo}
                          disabled={isSelf}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...edit,
                                ativo: e.target.checked,
                              },
                            }))
                          }
                        />
                        Ativo
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="password"
                        className="input"
                        placeholder="Nova senha (opcional)"
                        value={edit.senha}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            [user.id]: { ...edit, senha: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => setMode(user.id, "view")}
                          disabled={pending}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn-primary text-xs"
                          onClick={() => handleEditSave(user.id)}
                          disabled={pending}
                        >
                          {pending ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                      {error ? (
                        <div className="mt-1 text-[11px] text-red-600">
                          {error}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={user.id}
                  className="align-middle transition hover:bg-slate-50/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={user.nome} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">
                          {user.nome}
                          {isSelf ? (
                            <span className="ml-2 text-[11px] text-slate-500">
                              (você)
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3">{statusBadge(user.ativo)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDateBR(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Editar usuário"
                          title="Editar"
                          className="btn-icon"
                          onClick={() => setMode(user.id, "edit", user)}
                          disabled={pending}
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label={
                            mode === "reset"
                              ? "Fechar reset"
                              : "Resetar senha"
                          }
                          title={
                            mode === "reset"
                              ? "Fechar reset"
                              : "Resetar senha"
                          }
                          className="btn-icon"
                          onClick={() =>
                            setMode(
                              user.id,
                              mode === "reset" ? "view" : "reset",
                            )
                          }
                          disabled={pending}
                        >
                          {mode === "reset" ? (
                            <X size={14} />
                          ) : (
                            <KeyRound size={14} />
                          )}
                        </button>

                        {!isSelf ? (
                          user.ativo ? (
                            <button
                              type="button"
                              aria-label="Desativar usuário"
                              title="Desativar"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                              onClick={() => handleDesativar(user.id)}
                              disabled={pending}
                            >
                              {pending ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <PowerOff size={14} />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label="Reativar usuário"
                              title="Reativar"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                              onClick={() => handleReativar(user.id)}
                              disabled={pending}
                            >
                              {pending ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Power size={14} />
                              )}
                            </button>
                          )
                        ) : null}
                      </div>

                      {mode === "reset" ? (
                        <div className="mt-1 inline-flex items-center gap-2">
                          <input
                            type="password"
                            className="input py-1 text-xs"
                            placeholder="Nova senha (min 6)"
                            value={resetState[user.id] ?? ""}
                            onChange={(e) =>
                              setResetState((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-primary text-xs px-2 py-1"
                            onClick={() => handleResetConfirm(user.id)}
                            disabled={pending}
                          >
                            {pending ? "..." : "Confirmar reset"}
                          </button>
                        </div>
                      ) : null}

                      {error ? (
                        <div className="text-[11px] text-red-600">{error}</div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
