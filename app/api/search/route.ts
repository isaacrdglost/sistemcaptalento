import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  EstagioLead,
  Fluxo,
  Prisma,
  StatusCandidato,
} from "@prisma/client";

const MAX_RESULTS = 20;
const FALLBACK_LIMIT = 10;

export interface SearchVaga {
  id: string;
  titulo: string;
  cliente: string;
  fluxo: Fluxo;
  encerrada: boolean;
}

export interface SearchCandidato {
  id: string;
  vagaId: string;
  nome: string;
  status: StatusCandidato;
  vagaTitulo: string;
}

export interface SearchCliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  vagasCount: number;
}

export interface SearchTalento {
  id: string;
  nome: string;
  email: string | null;
  senioridade: string | null;
  area: string | null;
}

export interface SearchLead {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  estagio: EstagioLead;
  responsavelNome: string | null;
}

export interface SearchResponse {
  vagas: SearchVaga[];
  candidatos: SearchCandidato[];
  clientes: SearchCliente[];
  talentos: SearchTalento[];
  leads: SearchLead[];
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get("q") ?? "";
    const q = qRaw.trim();
    const isAdmin = session.user.role === "admin";
    const isComercial = session.user.role === "comercial";
    const userId = session.user.id;

    // Filtro de vaga baseado em role. Comercial não vê vagas/candidatos/
    // talentos — só leads + clientes (read-only). Usamos um where impossível
    // pra "zerar" os resultados sem mudar a estrutura da query.
    const NUNCA: Prisma.VagaWhereInput = { id: "__nunca__" };
    const vagaScope: Prisma.VagaWhereInput = isComercial
      ? NUNCA
      : isAdmin
        ? {}
        : { recrutadorId: userId };
    // Talentos: comercial não vê. Outros, vê todos ativos.
    const talentoExtraWhere: Prisma.TalentoWhereInput = isComercial
      ? { id: "__nunca__" }
      : {};

    // Filtro de leads — comercial só vê os próprios + sem responsável;
    // admin vê tudo; recruiter não recebe leads (excluímos com `null`).
    const leadScopeWhere: Prisma.LeadWhereInput | null =
      session.user.role === "recruiter"
        ? null
        : isAdmin
          ? { arquivado: false }
          : {
              arquivado: false,
              OR: [{ responsavelId: userId }, { responsavelId: null }],
            };

    if (q.length === 0) {
      const [vagasRaw, candidatosRaw, clientesRaw, talentosRaw, leadsRaw] =
        await Promise.all([
          prisma.vaga.findMany({
            where: vagaScope,
            orderBy: { createdAt: "desc" },
            take: FALLBACK_LIMIT,
            select: {
              id: true,
              titulo: true,
              cliente: true,
              fluxo: true,
              encerrada: true,
            },
          }),
          prisma.candidato.findMany({
            where: { vaga: vagaScope },
            orderBy: { createdAt: "desc" },
            take: FALLBACK_LIMIT,
            select: {
              id: true,
              vagaId: true,
              nome: true,
              status: true,
              vaga: { select: { titulo: true } },
            },
          }),
          prisma.cliente.findMany({
            where: { ativo: true },
            orderBy: { razaoSocial: "asc" },
            take: FALLBACK_LIMIT,
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              _count: { select: { vagas: true } },
            },
          }),
          prisma.talento.findMany({
            where: { AND: [{ ativo: true }, talentoExtraWhere] },
            orderBy: { createdAt: "desc" },
            take: FALLBACK_LIMIT,
            select: {
              id: true,
              nome: true,
              email: true,
              senioridade: true,
              area: true,
            },
          }),
          leadScopeWhere
            ? prisma.lead.findMany({
                where: leadScopeWhere,
                orderBy: { updatedAt: "desc" },
                take: FALLBACK_LIMIT,
                select: {
                  id: true,
                  razaoSocial: true,
                  nomeFantasia: true,
                  estagio: true,
                  responsavel: { select: { nome: true } },
                },
              })
            : Promise.resolve(
                [] as Array<{
                  id: string;
                  razaoSocial: string;
                  nomeFantasia: string | null;
                  estagio: EstagioLead;
                  responsavel: { nome: string } | null;
                }>,
              ),
        ]);

      const response: SearchResponse = {
        vagas: vagasRaw,
        candidatos: candidatosRaw.map((c) => ({
          id: c.id,
          vagaId: c.vagaId,
          nome: c.nome,
          status: c.status,
          vagaTitulo: c.vaga.titulo,
        })),
        clientes: clientesRaw.map((c) => ({
          id: c.id,
          razaoSocial: c.razaoSocial,
          nomeFantasia: c.nomeFantasia,
          vagasCount: c._count.vagas,
        })),
        talentos: talentosRaw.map((t) => ({
          id: t.id,
          nome: t.nome,
          email: t.email,
          senioridade: t.senioridade,
          area: t.area,
        })),
        leads: leadsRaw.map((l) => ({
          id: l.id,
          razaoSocial: l.razaoSocial,
          nomeFantasia: l.nomeFantasia,
          estagio: l.estagio,
          responsavelNome: l.responsavel?.nome ?? null,
        })),
      };
      return NextResponse.json(response);
    }

    const cnpjDigits = q.replace(/\D+/g, "");
    const leadOR: Prisma.LeadWhereInput[] = [
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { nomeFantasia: { contains: q, mode: "insensitive" } },
      { contatoNome: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
    if (cnpjDigits.length > 0) {
      leadOR.push({ cnpj: { contains: cnpjDigits } });
    }

    const [vagasRaw, candidatosRaw, clientesRaw, talentosRaw, leadsRaw] =
      await Promise.all([
        prisma.vaga.findMany({
          where: {
            AND: [
              vagaScope,
              {
                OR: [
                  { titulo: { contains: q, mode: "insensitive" } },
                  { cliente: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: MAX_RESULTS,
          select: {
            id: true,
            titulo: true,
            cliente: true,
            fluxo: true,
            encerrada: true,
          },
        }),
        prisma.candidato.findMany({
          where: {
            AND: [
              { vaga: vagaScope },
              { nome: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: MAX_RESULTS,
          select: {
            id: true,
            vagaId: true,
            nome: true,
            status: true,
            vaga: { select: { titulo: true } },
          },
        }),
        prisma.cliente.findMany({
          where: {
            OR: [
              { razaoSocial: { contains: q, mode: "insensitive" } },
              { nomeFantasia: { contains: q, mode: "insensitive" } },
              { cnpj: { contains: cnpjDigits, mode: "insensitive" } },
            ],
          },
          orderBy: { razaoSocial: "asc" },
          take: MAX_RESULTS,
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            _count: { select: { vagas: true } },
          },
        }),
        prisma.talento.findMany({
          where: {
            AND: [
              { ativo: true },
              talentoExtraWhere,
              {
                OR: [
                  { nome: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { area: { contains: q, mode: "insensitive" } },
                  { tags: { has: q } },
                ],
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: MAX_RESULTS,
          select: {
            id: true,
            nome: true,
            email: true,
            senioridade: true,
            area: true,
          },
        }),
        leadScopeWhere
          ? prisma.lead.findMany({
              where: { AND: [leadScopeWhere, { OR: leadOR }] },
              orderBy: { updatedAt: "desc" },
              take: MAX_RESULTS,
              select: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
                estagio: true,
                responsavel: { select: { nome: true } },
              },
            })
          : Promise.resolve(
              [] as Array<{
                id: string;
                razaoSocial: string;
                nomeFantasia: string | null;
                estagio: EstagioLead;
                responsavel: { nome: string } | null;
              }>,
            ),
      ]);

    const response: SearchResponse = {
      vagas: vagasRaw,
      candidatos: candidatosRaw.map((c) => ({
        id: c.id,
        vagaId: c.vagaId,
        nome: c.nome,
        status: c.status,
        vagaTitulo: c.vaga.titulo,
      })),
      clientes: clientesRaw.map((c) => ({
        id: c.id,
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia,
        vagasCount: c._count.vagas,
      })),
      talentos: talentosRaw.map((t) => ({
        id: t.id,
        nome: t.nome,
        email: t.email,
        senioridade: t.senioridade,
        area: t.area,
      })),
      leads: leadsRaw.map((l) => ({
        id: l.id,
        razaoSocial: l.razaoSocial,
        nomeFantasia: l.nomeFantasia,
        estagio: l.estagio,
        responsavelNome: l.responsavel?.nome ?? null,
      })),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search] erro ao buscar:", error);
    return NextResponse.json(
      { error: "Erro ao processar busca" },
      { status: 500 },
    );
  }
}
