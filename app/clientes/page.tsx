import { Building2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ClientesBusca } from "@/components/ClientesBusca";
import { NovoClienteModal } from "@/components/NovoClienteModal";
import type { ClienteRow } from "@/components/ClienteTypes";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function ClientesPage() {
  const session = await requireSession();

  const clientes = await prisma.cliente.findMany({
    orderBy: [{ ativo: "desc" }, { razaoSocial: "asc" }],
    include: {
      _count: { select: { vagas: true } },
      vagas: { where: { encerrada: false }, select: { id: true } },
    },
  });

  const rows: ClienteRow[] = clientes.map((c) => ({
    id: c.id,
    razaoSocial: c.razaoSocial,
    nomeFantasia: c.nomeFantasia,
    cnpj: c.cnpj,
    emailPrincipal: c.emailPrincipal,
    telefone: c.telefone,
    segmento: c.segmento,
    ativo: c.ativo,
    _count: c._count,
    vagasAbertas: c.vagas.length,
  }));

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clientes" },
      ]}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Clientes
            </h1>
            <p className="text-sm text-slate-500">
              Banco de clientes da CapTalento RH
            </p>
          </div>
          <NovoClienteModal />
        </div>

        {rows.length === 0 ? (
          <EmptyClientes />
        ) : (
          <ClientesBusca initial={rows} />
        )}
      </div>
    </AppShell>
  );
}

function EmptyClientes() {
  return (
    <div className="card flex flex-col items-center gap-4 p-12 text-center animate-fade-in-up">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-royal-50 text-royal">
        <Building2 size={28} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-ink">
          Nenhum cliente cadastrado ainda
        </h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Cadastre seu primeiro cliente para começar a associar vagas e
          organizar o portfólio.
        </p>
      </div>
      <NovoClienteModal triggerLabel="Cadastrar primeiro cliente" />
    </div>
  );
}
