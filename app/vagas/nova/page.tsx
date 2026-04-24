import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { NovaVagaForm } from "@/components/NovaVagaForm";

interface PageProps {
  searchParams?: { clienteId?: string };
}

export default async function NovaVagaPage({ searchParams }: PageProps) {
  const session = await requireSession();

  const [recrutadores, clientes] = await Promise.all([
    session.user.role === "admin"
      ? prisma.user.findMany({
          where: { role: "recruiter", ativo: true },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true },
        })
      : Promise.resolve([]),
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
  ]);

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
            clientes={clientes}
            clienteIdInicial={searchParams?.clienteId}
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
