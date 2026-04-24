"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

type ActionResult = { ok: true } | { error: string };
type TesteResult =
  | { ok: true; eventosEncontrados: number }
  | { error: string };

const urlSchema = z
  .string()
  .trim()
  .url("URL inválida")
  .refine(
    (u) => /\.ics(\?|$)/i.test(u) || /calendar\.google\.com/i.test(u),
    "Use a URL secreta do calendário Google em formato iCal (.ics)",
  );

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export async function atualizarCalendarioIcs(url: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "URL inválida" };
  }

  try {
    const encrypted = encryptSecret(parsed.data);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarIcsUrlEnc: encrypted },
    });
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (err) {
    console.error("[configuracoes] erro ao salvar URL", err);
    return { error: "Erro ao salvar URL" };
  }
}

export async function removerCalendarioIcs(): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarIcsUrlEnc: null },
    });
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (err) {
    console.error("[configuracoes] erro ao remover URL", err);
    return { error: "Erro ao remover URL" };
  }
}

/**
 * Testa uma URL sem persistir — útil pra dar feedback imediato no form.
 * Faz um fetch rápido e conta quantos VEVENT o feed devolve.
 */
export async function testarCalendarioIcs(url: string): Promise<TesteResult> {
  const session = await requireUser();
  if (!session) return { error: "Não autenticado" };

  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "URL inválida" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(parsed.data, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "CapTalentoRH/1.0",
        Accept: "text/calendar",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { error: `Google respondeu HTTP ${res.status}` };
    }
    const text = await res.text();
    // Contagem rápida de VEVENTs sem rodar o parser completo
    const matches = text.match(/^BEGIN:VEVENT/gim);
    return { ok: true, eventosEncontrados: matches?.length ?? 0 };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { error: "Tempo esgotado" };
    }
    console.error("[configuracoes] erro ao testar URL", err);
    return { error: "Falha ao consultar o calendário" };
  }
}
