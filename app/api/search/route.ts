import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Fluxo, StatusCandidato } from "@prisma/client";

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

export interface SearchResponse {
  vagas: SearchVaga[];
  candidatos: SearchCandidato[];
  clientes: SearchCliente[];
  talentos: SearchTalento[];
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
    const userId = session.user.id;

    // Filtro de vaga baseado em role
    const vagaScope = isAdmin ? {} : { recrutadorId: userId };

    if (q.length === 0) {
      const [vagasRaw, candidatosRaw, clientesRaw, talentosRaw] =
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
            where: { ativo: true },
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
      };
      return NextResponse.json(response);
    }

    const [vagasRaw, candidatosRaw, clientesRaw, talentosRaw] =
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
              { cnpj: { contains: q.replace(/\D+/g, ""), mode: "insensitive" } },
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
