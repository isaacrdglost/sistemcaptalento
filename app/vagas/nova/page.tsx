import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { NovaVagaForm } from "@/components/NovaVagaForm";

export default async function NovaVagaPage() {
  const session = await requireSession();

  const recrutadores =
    session.user.role === "admin"
      ? await prisma.user.findMany({
          where: { role: "recruiter", ativo: true },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true },
        })
      : [];

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Nova vaga" },
      ]}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Nova vaga
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Preencha o briefing para começar o processo.
          </p>
        </div>
        <div className="card animate-fade-in-up p-6">
          <NovaVagaForm
            recrutadores={recrutadores}
            currentUser={{
              id: session.user.id,
              nome: session.user.name!,
              role: session.user.role,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
