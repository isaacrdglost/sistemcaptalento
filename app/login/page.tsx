import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginChips } from "@/components/LoginChips";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  // Não expor `role` no payload — evita que qualquer um na tela de login
  // identifique quem é admin.
  const users = await prisma.user.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true },
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-royal text-sm font-bold text-white">
              C
            </span>
            <span className="text-sm font-bold tracking-tight">
              CapTalento <span className="text-royal">RH</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="card w-full max-w-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Bem-vindo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Selecione seu nome para entrar
            </p>
          </div>
          <LoginChips users={users} />
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        CapTalento RH
      </footer>
    </div>
  );
}
