import { Building2, Briefcase, CalendarPlus, Users } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ClientesBusca } from "@/components/ClientesBusca";
import { NovoClienteModal } from "@/components/NovoClienteModal";
import type { ClienteRow } from "@/components/ClienteTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
    createdAt: c.createdAt,
    _count: c._count,
    vagasAbertas: c.vagas.length,
  }));

  const totalAtivos = clientes.filter((c) => c.ativo).length;
  const totalVagasAbertas = clientes.reduce(
    (acc, c) => acc + c.vagas.length,
    0,
  );

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const novosNoMes = clientes.filter((c) => c.createdAt >= inicioMes).length;

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
      <div className="container-app space-y-6">
        <PageHeader
          eyebrow="CRM"
          title="Clientes"
          subtitle="Banco de clientes da CapTalento RH"
          actions={<NovoClienteModal />}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum cliente cadastrado ainda"
            description="Cadastre seu primeiro cliente para começar a associar vagas e organizar o portfólio."
            action={<NovoClienteModal triggerLabel="Cadastrar primeiro cliente" />}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0ms" }}
              >
                <StatCard
                  label="Ativos"
                  value={totalAtivos}
                  hint={
                    clientes.length === totalAtivos
                      ? "todos no portfólio"
                      : `de ${clientes.length} totais`
                  }
                  icon={Users}
                  tone="royal"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "60ms" }}
              >
                <StatCard
                  label="Vagas abertas"
                  value={totalVagasAbertas}
                  hint="somando todos os clientes"
                  icon={Briefcase}
                  tone="lima"
                  size="sm"
                />
              </div>
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "120ms" }}
              >
                <StatCard
                  label="Cadastrados este mês"
                  value={novosNoMes}
                  hint="desde o dia 1"
                  icon={CalendarPlus}
                  tone="amber"
                  size="sm"
                />
              </div>
            </div>

            <ClientesBusca initial={rows} />
          </>
        )}
      </div>
    </AppShell>
  );
}
