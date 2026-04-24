import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { decryptSecret, maskIcsUrl } from "@/lib/crypto";
import { CalendarIcsForm } from "@/components/CalendarIcsForm";

export default async function ConfiguracoesPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarIcsUrlEnc: true },
  });

  let urlMascarada: string | null = null;
  if (user?.calendarIcsUrlEnc) {
    try {
      const plain = decryptSecret(user.calendarIcsUrlEnc);
      urlMascarada = maskIcsUrl(plain);
    } catch {
      // Se decriptar falhar, mostramos estado "não configurado" — o user
      // reconfigura e regrava com a chave atual.
      urlMascarada = null;
    }
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Configurações" },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Preferências pessoais da sua conta.
          </p>
        </div>

        <CalendarIcsForm urlMascarada={urlMascarada} />
      </div>
    </AppShell>
  );
}
