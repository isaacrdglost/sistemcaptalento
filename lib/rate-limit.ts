/**
 * Rate-limit muito simples em memória, baseado em janela deslizante.
 * Suficiente pra MVP — em produção real (multi-instância) o ideal é trocar
 * por Upstash/Redis/Vercel KV. Aqui aceitamos perda em cold-start: cada
 * função serverless tem seu próprio mapa, então o limite é por instância.
 *
 * Uso típico:
 *   const r = checkRateLimit(`capturar:${ip}`, 10, 60 * 60 * 1000);
 *   if (!r.ok) return new Response("Too many requests", { status: 429 });
 */

interface Bucket {
  hits: number[]; // timestamps em ms
}

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number; // ms até a janela expirar
}

export function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = BUCKETS.get(key) ?? { hits: [] };
  // limpa hits fora da janela
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= maxHits) {
    BUCKETS.set(key, bucket);
    const earliest = bucket.hits[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      resetIn: Math.max(0, earliest + windowMs - now),
    };
  }

  bucket.hits.push(now);
  BUCKETS.set(key, bucket);
  return {
    ok: true,
    remaining: maxHits - bucket.hits.length,
    resetIn: windowMs,
  };
}

/**
 * Tenta extrair o IP do request usando os headers padrão de proxy. Em
 * produção atrás da Vercel, `x-forwarded-for` é o canal correto.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
