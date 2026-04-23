import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { UserList, type UserListItem } from "@/components/UserList";
import {
  AdminVagasTable,
  type AdminVagaRow,
} from "@/components/AdminVagasTable";

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Administração
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestão de usuários e visão completa das vagas.
          </p>
        </div>

        <section className="space-y-3 animate-fade-in-up">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Usuários
          </h2>
          <UserList users={usersData} currentUserId={session.user.id} />
        </section>

        <section className="space-y-3 animate-fade-in-up">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Todas as vagas
          </h2>
          <AdminVagasTable vagas={vagasData} />
        </section>
      </div>
    </AppShell>
  );
}
