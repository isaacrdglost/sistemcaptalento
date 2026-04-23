"use client";

import { useState, useTransition } from "react";
import type { AppRole } from "@/lib/auth";
import {
  atualizarUsuario,
  criarUsuario,
  desativarUsuario,
  reativarUsuario,
  resetarSenha,
} from "@/app/admin/actions";
import { formatDateBR } from "@/lib/business-days";

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
    return <span className="badge-royal">Admin</span>;
  }
  return <span className="badge-slate">Recrutadora</span>;
}

function statusBadge(ativo: boolean) {
  if (ativo) return <span className="badge-green">Ativo</span>;
  return <span className="badge-red">Inativo</span>;
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
          className="card p-4 flex flex-col gap-3"
        >
          <h3 className="text-sm font-semibold text-ink">Novo usuário</h3>
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
              <select
                id="create-role"
                className="input"
                value={createState.role}
                onChange={(e) =>
                  setCreateState((s) => ({
                    ...s,
                    role: e.target.value as AppRole,
                  }))
                }
              >
                <option value="recruiter">Recrutadora</option>
                <option value="admin">Admin</option>
              </select>
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
          <thead>
            <tr className="text-xs uppercase text-slate-500">
              <th className="px-4 py-3 text-left font-semibold">Nome</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Papel</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Criado em</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const mode: RowMode = rowModes[user.id] ?? "view";
              const isSelf = user.id === currentUserId;
              const error = rowErrors[user.id] ?? null;
              const edit = editState[user.id];

              if (mode === "edit" && edit) {
                return (
                  <tr
                    key={user.id}
                    className="border-t border-slate-200 bg-slate-50 align-top"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="input"
                        value={edit.nome}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            [user.id]: { ...edit, nome: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        className="input"
                        value={edit.email}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            [user.id]: { ...edit, email: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input"
                        value={edit.role}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...edit,
                              role: e.target.value as AppRole,
                            },
                          }))
                        }
                      >
                        <option value="recruiter">Recrutadora</option>
                        <option value="admin">Admin</option>
                      </select>
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
                  className="border-t border-slate-200 align-middle"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {user.nome}
                    {isSelf ? (
                      <span className="ml-2 text-[11px] text-slate-500">
                        (você)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3">{statusBadge(user.ativo)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDateBR(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className="text-royal text-xs font-semibold hover:underline"
                          onClick={() => setMode(user.id, "edit", user)}
                          disabled={pending}
                        >
                          Editar
                        </button>

                        {!isSelf ? (
                          user.ativo ? (
                            <button
                              type="button"
                              className="text-amber-700 text-xs font-semibold hover:underline"
                              onClick={() => handleDesativar(user.id)}
                              disabled={pending}
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-emerald-700 text-xs font-semibold hover:underline"
                              onClick={() => handleReativar(user.id)}
                              disabled={pending}
                            >
                              Reativar
                            </button>
                          )
                        ) : null}

                        <button
                          type="button"
                          className="text-slate-700 text-xs font-semibold hover:underline"
                          onClick={() =>
                            setMode(
                              user.id,
                              mode === "reset" ? "view" : "reset",
                            )
                          }
                          disabled={pending}
                        >
                          {mode === "reset" ? "Fechar reset" : "Resetar senha"}
                        </button>
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
