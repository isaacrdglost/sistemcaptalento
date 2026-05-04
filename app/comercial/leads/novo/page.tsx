import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadInfoForm } from "@/components/LeadInfoForm";
import { requireComercial } from "@/lib/session";

export default async function NovoLeadPage() {
  const session = await requireComercial();

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "Vendas" },
        { label: "CRM", href: "/comercial" },
        { label: "Novo lead" },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/comercial"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-ink"
        >
          <ArrowLeft size={14} />
          Voltar para o CRM
        </Link>

        <PageHeader
          eyebrow="Vendas"
          title="Novo lead"
          subtitle="Cadastre uma empresa que entrou no radar comercial. Você pode complementar dados depois."
        />

        <section className="card p-6">
          <LeadInfoForm mode="create" />
        </section>
      </div>
    </AppShell>
  );
}
