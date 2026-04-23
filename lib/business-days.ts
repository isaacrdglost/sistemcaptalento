/**
 * Utilitários de dias úteis (segunda a sexta). Feriados não são considerados
 * para manter o cálculo determinístico — o recrutador pode sobrescrever prazos
 * manualmente quando houver feriado relevante.
 */

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  return dow !== 0 && dow !== 6;
}

/**
 * Soma N dias úteis a uma data. Aceita N negativo (anda para trás).
 * Se a data inicial cair em fim de semana, ajusta para o próximo dia útil
 * antes de contar (para N >= 0) ou para o dia útil anterior (para N < 0).
 */
export function addBusinessDays(start: Date, n: number): Date {
  const d = startOfDay(start);
  const step = n >= 0 ? 1 : -1;
  while (!isBusinessDay(d)) d.setDate(d.getDate() + step);
  let remaining = Math.abs(n);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    if (isBusinessDay(d)) remaining--;
  }
  return d;
}

/**
 * Diferença em dias úteis entre duas datas (from → to).
 * Positivo se `to` é depois de `from`. Inclusivo nas bordas? Não: conta quantos
 * dias úteis há ESTRITAMENTE entre (exclusivo em `from`, inclusivo em `to`).
 */
export function diffBusinessDays(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (a.getTime() === b.getTime()) return 0;
  const sign = b > a ? 1 : -1;
  let count = 0;
  const cursor = new Date(a);
  while (cursor.getTime() !== b.getTime()) {
    cursor.setDate(cursor.getDate() + sign);
    if (isBusinessDay(cursor)) count += sign;
  }
  return count;
}

/**
 * Dias úteis restantes até a data alvo, a partir de hoje.
 * Negativo significa que a data já passou.
 */
export function businessDaysUntil(target: Date, from: Date = new Date()): number {
  return diffBusinessDays(from, target);
}

export function formatDateBR(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShortBR(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Formata dias úteis restantes para exibição humana.
 *  - null → "—"
 *  - 0 → "hoje"
 *  - >0 → "em N dia(s) útil(is)" (ou versão curta "em Nd")
 *  - <0 → "atrasado há N dia(s) útil(is)" (ou versão curta "atrasado há Nd")
 */
export function formatDiasRestantes(
  dias: number | null,
  opts: { short?: boolean } = {},
): string {
  if (dias === null) return "—";
  const { short = false } = opts;
  if (dias === 0) return "hoje";
  if (dias > 0) {
    if (short) return `em ${dias}d úteis`;
    return dias === 1 ? "em 1 dia útil" : `em ${dias} dias úteis`;
  }
  const abs = Math.abs(dias);
  if (short) return `atrasado há ${abs}d`;
  return abs === 1
    ? "atrasado há 1 dia útil"
    : `atrasado há ${abs} dias úteis`;
}

/**
 * Formata uma data como tempo relativo curto em pt-BR.
 * - < 60s → "agora"
 * - < 60min → "há N min"
 * - < 24h → "há N h"
 * - < 48h → "ontem"
 * - < 7 dias → "há N dias"
 * - Senão → data absoluta via formatDateBR
 */
export function formatRelative(
  date: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = now.getTime() - d.getTime();
  // Eventos no futuro (clock skew) caem como "agora".
  if (diffMs < 0) return "agora";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";

  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} h`;

  if (hr < 48) return "ontem";

  const days = Math.floor(hr / 24);
  if (days < 7) return `há ${days} dias`;

  return formatDateBR(d);
}
