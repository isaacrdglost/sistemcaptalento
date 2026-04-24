import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { parseIcs, extrairNomeCandidato, type IcsEvent } from "@/lib/ical";

export interface CalendarEventoImportavel {
  uid: string;
  titulo: string;
  nomeSugerido: string;
  descricao: string;
  local: string | null;
  inicio: string | null;
  fim: string | null;
  allDay: boolean;
  status: string | null;
}

export interface CalendarEventosResponse {
  ok: true;
  eventos: CalendarEventoImportavel[];
  /** UIDs de candidatos já importados previamente para esta vaga — usados
   * no client pra marcar como "já importado" e desmarcar por default. */
  uidsImportados: string[];
}

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — feeds Google raramente passam disso

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vagaId = searchParams.get("vagaId") ?? undefined;
    const daysBack = Number(searchParams.get("daysBack") ?? "60");
    const daysForward = Number(searchParams.get("daysForward") ?? "30");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { calendarIcsUrlEnc: true },
    });
    if (!user?.calendarIcsUrlEnc) {
      return NextResponse.json(
        { error: "Calendário não configurado" },
        { status: 409 },
      );
    }

    let url: string;
    try {
      url = decryptSecret(user.calendarIcsUrlEnc);
    } catch (err) {
      console.error("[calendar/eventos] falha ao decriptar url", err);
      return NextResponse.json(
        { error: "Falha ao ler URL do calendário. Reconfigure." },
        { status: 500 },
      );
    }

    // Busca o .ics com timeout e limite de tamanho
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let raw: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "CapTalentoRH/1.0",
          Accept: "text/calendar, text/plain",
        },
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `O Google devolveu HTTP ${res.status} na URL do calendário. Confira se a URL ainda é válida.`,
          },
          { status: 502 },
        );
      }
      const reader = res.body?.getReader();
      if (!reader) {
        raw = await res.text();
      } else {
        let total = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > MAX_BYTES) {
            controller.abort();
            return NextResponse.json(
              { error: "Calendário muito grande (>4MB). Contate o suporte." },
              { status: 413 },
            );
          }
          chunks.push(value);
        }
        raw = Buffer.concat(chunks).toString("utf8");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "Tempo esgotado ao buscar o calendário" },
          { status: 504 },
        );
      }
      console.error("[calendar/eventos] fetch erro", err);
      return NextResponse.json(
        { error: "Falha ao consultar o calendário" },
        { status: 502 },
      );
    } finally {
      clearTimeout(timer);
    }

    let events: IcsEvent[];
    try {
      events = parseIcs(raw);
    } catch (err) {
      console.error("[calendar/eventos] parse erro", err);
      return NextResponse.json(
        { error: "Conteúdo do calendário inválido" },
        { status: 502 },
      );
    }

    const now = new Date();
    const fromTs = now.getTime() - daysBack * 24 * 60 * 60 * 1000;
    const toTs = now.getTime() + daysForward * 24 * 60 * 60 * 1000;

    const eventosFiltrados: CalendarEventoImportavel[] = events
      .filter((e) => {
        if (e.status && e.status.toUpperCase() === "CANCELLED") return false;
        if (!e.start) return false;
        const ts = e.start.getTime();
        return ts >= fromTs && ts <= toTs;
      })
      .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))
      .map((e) => ({
        uid: e.uid,
        titulo: e.summary,
        nomeSugerido: extrairNomeCandidato(e.summary),
        descricao: e.description,
        local: e.location,
        inicio: e.start ? e.start.toISOString() : null,
        fim: e.end ? e.end.toISOString() : null,
        allDay: e.allDay,
        status: e.status,
      }));

    let uidsImportados: string[] = [];
    if (vagaId) {
      const existentes = await prisma.candidato.findMany({
        where: {
          vagaId,
          fonteOrigem: "calendar",
          fonteExternoId: { in: eventosFiltrados.map((e) => e.uid) },
        },
        select: { fonteExternoId: true },
      });
      uidsImportados = existentes
        .map((c) => c.fonteExternoId)
        .filter((v): v is string => !!v);
    }

    const response: CalendarEventosResponse = {
      ok: true,
      eventos: eventosFiltrados,
      uidsImportados,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[calendar/eventos] erro inesperado", err);
    return NextResponse.json(
      { error: "Erro ao processar calendário" },
      { status: 500 },
    );
  }
}
