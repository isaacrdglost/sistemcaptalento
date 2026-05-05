import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { LeadAtividadesPanel } from "@/components/LeadAtividadesPanel";
import { LeadDetailHero } from "@/components/LeadDetailHero";
import { LeadStatusPills } from "@/components/LeadStatusPills";
import { LeadQualificacaoForm } from "@/components/LeadQualificacaoForm";
import { LeadTagsCard } from "@/components/LeadTagsCard";
import { LeadHistoricoStatus } from "@/components/LeadHistoricoStatus";
import { LeadUtmCard } from "@/components/LeadUtmCard";
import { BannerLeadGanho, BannerLeadPerdido } from "@/components/LeadStatusBanners";
import { LeadEdicaoCompletaCard } from "@/components/LeadEdicaoCompletaCard";
import { LeadContatoCard } from "@/components/LeadContatoCard";
import { prisma } from "@/lib/prisma";
import { requireComercial } from "@/lib/session";
import { buscarPossiveisDuplicatas } from "@/app/comercial/actions";

interface PageProps {
  params: { id: string };
}

export default async function LeadDetailPage({ params }: PageProps) {
  const session = await requireComercial();
  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      responsavel: { select: { id: true, nome: true } },
      cliente: {
        select: { id: true, razaoSocial: true, nomeFantasia: true },
      },
      atividades: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { autor: { select: { id: true, nome: true } } },
      },
    },
  });

  if (!lead) notFound();

  // Permissão: admin vê tudo. Comercial só vê próprios ou sem responsável.
  const podeAcessar =
    isAdmin || lead.responsavelId === null || lead.responsavelId === userId;
  if (!podeAcessar) notFound();

  const podeAgir =
    isAdmin || lead.responsavelId === null || lead.responsavelId === userId;
  const finalizado = lead.estagio === "ganho" || lead.estagio === "perdido";
  const podeEditarCampos = podeAgir && !finalizado;

  const [duplicatas, templates] = await Promise.all([
    buscarPossiveisDuplicatas({
      email: lead.email,
      telefone: lead.telefone,
      cnpj: lead.cnpj,
      excluirId: lead.id,
    }),
    prisma.mensagemTemplate.findMany({
      where: { ativo: true },
      orderBy: [{ canal: "asc" }, { ordem: "asc" }],
    }),
  ]);

  const templatesWhatsapp = templates.filter((t) => t.canal === "whatsapp");
  const templatesEmail = templates.filter((t) => t.canal === "email");

  const atividades = lead.atividades.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    descricao: a.descricao,
    metadata: a.metadata,
    agendadoPara: a.agendadoPara,
    concluidoEm: a.concluidoEm,
    createdAt: a.createdAt,
    autor: a.autor,
  }));

  const temUtm = Boolean(
    lead.utmSource || lead.utmMedium || lead.utmCampaign,
  );

  return (
    <AppShell
      user={{
        name: session.user.name ?? "—",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      breadcrumbs={[
        { label: "CRM", href: "/comercial" },
        { label: lead.razaoSocial },
      ]}
    >
      <div className="container-app space-y-6">
        <LeadDetailHero
          lead={lead}
          podeAgir={podeAgir}
          duplicatas={duplicatas}
          templatesWhatsapp={templatesWhatsapp}
          templatesEmail={templatesEmail}
        />

        {lead.estagio === "ganho" && lead.cliente ? (
          <BannerLeadGanho
            dataGanho={lead.dataGanho}
            cliente={lead.cliente}
          />
        ) : null}

        {lead.estagio === "perdido" ? (
          <BannerLeadPerdido
            dataPerda={lead.dataPerda}
            motivoPerda={lead.motivoPerda}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <LeadContatoCard lead={lead} />
            <LeadQualificacaoForm
              lead={lead}
              podeAgir={podeEditarCampos}
            />
            <LeadAtividadesPanel
              leadId={lead.id}
              atividades={atividades}
              currentUserId={userId}
              isAdmin={isAdmin}
              podeAgir={podeAgir}
            />
          </div>
          <aside className="space-y-6">
            <LeadStatusPills
              leadId={lead.id}
              estagioAtual={lead.estagio}
              razaoSocial={lead.razaoSocial}
              podeAgir={podeAgir}
            />
            <LeadTagsCard
              lead={lead}
              podeAgir={podeEditarCampos}
            />
            {temUtm ? <LeadUtmCard lead={lead} /> : null}
            <LeadHistoricoStatus atividades={atividades} />
            <LeadEdicaoCompletaCard
              lead={lead}
              podeAgir={podeEditarCampos}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
