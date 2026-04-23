"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

type ChipUser = {
  id: string;
  nome: string;
  email: string;
};

export function LoginChips({ users }: { users: ChipUser[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedUser = users.find((u) => u.id === selected) ?? null;

  function handleSelect(userId: string) {
    setSelected(userId);
    setPassword("");
    setError(null);
  }

  function handleClear() {
    setSelected(null);
    setPassword("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser || loading) return;
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: selectedUser.email,
      password,
      redirect: false,
    });
    if (!res || res.error) {
      setLoading(false);
      setError("Senha incorreta");
      return;
    }
    // Navegação "hard" via window.location força o browser a enviar o
    // cookie de sessão recém-setado na próxima request. Usando router.push
    // aqui, o SSR da /dashboard ocasionalmente não via o cookie ainda e
    // redirecionava de volta pro /login — exigindo um segundo Enter.
    window.location.assign("/dashboard");
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => handleSelect(u.id)}
            className={cn("chip", selected === u.id && "chip-active")}
          >
            {u.nome}
          </button>
        ))}
      </div>

      {selectedUser && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          <div>
            <label htmlFor="password" className="label">
              Senha de {selectedUser.nome}
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="input"
              disabled={loading}
            />
            {error && (
              <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="btn-ghost"
              disabled={loading}
            >
              Voltar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || password.length === 0}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
