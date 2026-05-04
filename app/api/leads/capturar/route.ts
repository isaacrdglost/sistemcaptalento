import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint público de captura de leads. Acionado pelo formulário do site
 * rhcaptalento.com.br ou outras campanhas que enviem POST direto.
 *
 * Proteções:
 *  - Honeypot: campo `website` (invisível no form humano). Bots preenchem
 *    automaticamente; quando vier preenchido, devolvemos 200 mas não
 *    gravamos. Comportamento "silencioso" frustra o bot e evita feedback.
 *  - Rate limit: 10 req/h por IP (in-memory, ver lib/rate-limit.ts).
 *  - Validação Zod: pelo menos um de email/telefone obrigatório.
 *  - CORS: liberado pra rhcaptalento.com.br (e localhost em dev).
 *
 * Atribuição: lead criado fica sem responsável (`responsavelId = null`),
 * cai na "caixa de entrada" do CRM. Origem default = "site".
 */

const ORIGEM_PERMITIDA = z.enum([
  "site",
  "redes_sociais",
  "linkedin",
  "evento",
  "whatsapp",
  "outro",
]);

const SENIORIDADE_PERMITIDA = z.enum([
  "estagio",
  "junior",
  "pleno",
  "senior",
  "especialista",
  "lideranca",
]);

const VOLUME_PERMITIDO = z.enum([
  "uma_vaga",
  "duas_a_cinco",
  "seis_a_dez",
  "mais_de_dez",
]);

const URGENCIA_PERMITIDA = z.enum([
  "imediata",
  "ate_30d",
  "ate_60d",
  "sem_prazo",
]);

const MODALIDADE_PERMITIDA = z.enum([
  "clt",
  "pj",
  "autonomo",
  "estagio",
  "misto",
]);

const schema = z
  .object({
    // === Step 1 — dados do cliente ===
    empresa: z.string().trim().min(2, "Empresa obrigatória").max(200),
    /// Segmento/setor da empresa (ex: "Tech", "Saúde", "Varejo")
    segmento: z.string().trim().max(100).optional().nullable(),
    contato: z.string().trim().max(200).optional().nullable(),
    /// Cargo da pessoa que está preenchendo o form
    contatoCargo: z.string().trim().max(200).optional().nullable(),
    email: z
      .string()
      .trim()
      .email()
      .max(200)
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    telefone: z.string().trim().max(40).optional().nullable(),

    // === Step 2 — dados da vaga ===
    /// Cargo/posição que a empresa precisa preencher (diferente de contatoCargo)
    cargoInteresse: z.string().trim().max(200).optional().nullable(),
    senioridade: SENIORIDADE_PERMITIDA.optional().nullable(),
    volumeVagas: VOLUME_PERMITIDO.optional().nullable(),
    urgencia: URGENCIA_PERMITIDA.optional().nullable(),
    /// Faixa salarial / orçamento — texto livre ("R$ 5-7k", "Até 10k", etc)
    orcamento: z.string().trim().max(200).optional().nullable(),
    modalidade: MODALIDADE_PERMITIDA.optional().nullable(),
    jaTrabalhouComAgencia: z.boolean().optional().nullable(),

    // === Mensagem livre + tracking ===
    mensagem: z.string().trim().max(5000).optional().nullable(),
    origem: ORIGEM_PERMITIDA.optional(),
    origemDescricao: z.string().trim().max(200).optional().nullable(),
    utmSource: z.string().trim().max(120).optional().nullable(),
    utmMedium: z.string().trim().max(120).optional().nullable(),
    utmCampaign: z.string().trim().max(120).optional().nullable(),

    // honeypot: campo invisível no form humano. Se preenchido, é bot.
    website: z.string().optional().nullable(),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.telefone), {
    message: "Informe email ou telefone",
    path: ["email"],
  });

const ALLOWED_ORIGINS = [
  "https://rhcaptalento.com.br",
  "https://www.rhcaptalento.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // Rate limit por IP — 10 req/h
  const ip = getClientIp(req);
  const rl = checkRateLimit(`capturar:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429, headers: cors },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers: cors },
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Dados inválidos",
      },
      { status: 422, headers: cors },
    );
  }
  const data = parsed.data;

  // Honeypot — bots preenchem todos os campos. Resposta 200 sem gravar
  // pra não dar pista ao bot.
  if (data.website && data.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  try {
    await prisma.lead.create({
      data: {
        // step 1
        razaoSocial: data.empresa,
        segmento: data.segmento ?? null,
        contatoNome: data.contato ?? null,
        contatoCargo: data.contatoCargo ?? null,
        email: data.email ? data.email.toLowerCase() : null,
        telefone: data.telefone ?? null,
        // step 2 — qualificação
        cargoInteresse: data.cargoInteresse ?? null,
        senioridadeBuscada: data.senioridade ?? null,
        volumeVagas: data.volumeVagas ?? null,
        urgencia: data.urgencia ?? null,
        orcamento: data.orcamento ?? null,
        modalidade: data.modalidade ?? null,
        jaTrabalhouComAgencia:
          data.jaTrabalhouComAgencia ?? null,
        // mensagem livre + tracking
        mensagem: data.mensagem ?? null,
        origem: data.origem ?? "site",
        origemDescricao: data.origemDescricao ?? null,
        utmSource: data.utmSource ?? null,
        utmMedium: data.utmMedium ?? null,
        utmCampaign: data.utmCampaign ?? null,
        // sem responsável — cai na caixa de entrada compartilhada
        responsavelId: null,
        estagio: "novo",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (err) {
    console.error("[/api/leads/capturar] erro", err);
    return NextResponse.json(
      { error: "Erro ao registrar lead" },
      { status: 500, headers: cors },
    );
  }
}
