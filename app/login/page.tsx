import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginChips } from "@/components/LoginChips";
import { Logo } from "@/components/ui/Logo";

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-mesh">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="card w-full max-w-2xl p-8 sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size={56} variant="brand" />
            <h1 className="mt-5 text-h2 text-ink">Bem-vinda de volta</h1>
            <p className="mt-1 text-sm text-slate-500">
              Selecione seu nome para entrar
            </p>
          </div>
          <LoginChips users={users} />
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400">
        <span className="font-semibold text-slate-500">CapTalento</span> RH ·
        Plataforma interna
      </footer>
    </div>
  );
}
