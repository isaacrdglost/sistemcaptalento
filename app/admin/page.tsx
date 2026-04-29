import { Briefcase, BriefcaseBusiness, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { UserList, type UserListItem } from "@/components/UserList";
import {
  AdminVagasTable,
  type AdminVagaRow,
} from "@/components/AdminVagasTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

export default async function AdminPage() {
  const session = await requireAdmin();

  const [users, vagas] = await Promise.all([
    prisma.user.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
      },
    }),
    prisma.vaga.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        recrutador: {
          select: { id: true, nome: true },
        },
      },
    }),
  ]);

  const usersData: UserListItem[] = users;
  const vagasData: AdminVagaRow[] = vagas;

  const usuariosAtivos = users.filter((u) => u.ativo).length;
  const totalRecrutadoras = users.filter(
    (u) => u.role === "recruiter" && u.ativo,
  ).length;
  const totalVagas = vagas.length;
  const vagasEncerradas = vagas.filter((v) => v.encerrada).length;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Administração" },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          eyebrow="Sistema"
          title="Administração"
          subtitle="Gestão de usuários e visão completa das vagas"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
          >
            <StatCard
              label="Usuários ativos"
              value={usuariosAtivos}
              hint={`de ${users.length} totais`}
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
              label="Recrutadoras"
              value={totalRecrutadoras}
              icon={ShieldCheck}
              tone="lima"
              size="sm"
            />
          </div>
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <StatCard
              label="Total de vagas"
              value={totalVagas}
              icon={Briefcase}
              tone="amber"
              size="sm"
            />
          </div>
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <StatCard
              label="Vagas encerradas"
              value={vagasEncerradas}
              icon={BriefcaseBusiness}
              tone="slate"
              size="sm"
            />
          </div>
        </div>

        <section
          className="space-y-3 animate-fade-in-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="section-label">Usuários</div>
          <UserList users={usersData} currentUserId={session.user.id} />
        </section>

        <section
          className="space-y-3 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="section-label">Todas as vagas</div>
          <AdminVagasTable vagas={vagasData} />
        </section>
      </div>
    </AppShell>
  );
}
