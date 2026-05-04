import { Mail, MessageCircle, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { TemplateSection } from "./TemplateSection";

export default async function AdminTemplatesPage() {
  const session = await requireAdmin();

  const templates = await prisma.mensagemTemplate.findMany({
    orderBy: [{ canal: "asc" }, { ordem: "asc" }, { nome: "asc" }],
  });

  const whatsapp = templates
    .filter((t) => t.canal === "whatsapp")
    .map((t) => ({
      id: t.id,
      nome: t.nome,
      canal: t.canal as "whatsapp" | "email",
      assunto: t.assunto,
      corpo: t.corpo,
      ordem: t.ordem,
      ativo: t.ativo,
    }));
  const email = templates
    .filter((t) => t.canal === "email")
    .map((t) => ({
      id: t.id,
      nome: t.nome,
      canal: t.canal as "whatsapp" | "email",
      assunto: t.assunto,
      corpo: t.corpo,
      ordem: t.ordem,
      ativo: t.ativo,
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
        { label: "Administração", href: "/admin" },
        { label: "Templates" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Sistema"
          title="Templates de mensagem"
          subtitle="Mensagens de WhatsApp e email pré-formatadas usadas pelo comercial"
        />

        {templates.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhum template ainda"
            description="Crie templates de WhatsApp e email pra acelerar a prospecção do comercial."
          />
        ) : null}

        <TemplateSection
          canal="whatsapp"
          titulo="WhatsApp"
          descricao="Mensagens pra primeira abordagem e follow-up via WhatsApp"
          icone={MessageCircle}
          templates={whatsapp}
        />

        <TemplateSection
          canal="email"
          titulo="Email"
          descricao="Templates de email com assunto e corpo. Usados em respostas e apresentações"
          icone={Mail}
          templates={email}
        />
      </div>
    </AppShell>
  );
}
