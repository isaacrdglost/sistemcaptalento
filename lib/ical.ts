/**
 * Parser enxuto de iCalendar (RFC 5545) focado no caso de uso:
 * extrair eventos (VEVENT) com título, descrição, datas e UID de um feed
 * .ics do Google Calendar. Não cobre RRULE, VTIMEZONE custom, VALARM, etc.
 * Recorrentes são tratados como uma única ocorrência (a primeira do stream).
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  location: string | null;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  status: string | null;
}

/**
 * Desfaz "line folding": linhas que começam com espaço ou tab são
 * continuação da linha anterior (RFC 5545 §3.1).
 */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (out.length > 0) {
        out[out.length - 1] += line.slice(1);
      }
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * Processa escapes de texto do RFC 5545: \n \N → newline, \, → vírgula,
 * \; → ponto e vírgula, \\ → backslash.
 */
function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parseia uma data ICS. Suporta três formatos:
 *  - "YYYYMMDDTHHMMSSZ" — UTC
 *  - "YYYYMMDDTHHMMSS" — local/flutuante (tratamos como UTC pra estabilidade)
 *  - "YYYYMMDD" — all-day
 */
function parseIcsDate(value: string): { date: Date; allDay: boolean } | null {
  if (!value) return null;
  const utc = value.endsWith("Z");
  const v = utc ? value.slice(0, -1) : value;

  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    return { date, allDay: true };
  }

  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(v);
  if (dt) {
    const [, y, m, d, hh, mm, ss] = dt;
    const date = utc
      ? new Date(
          Date.UTC(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss),
          ),
        )
      : // "flutuante" (sem Z nem TZID) — assumimos UTC pra evitar shift
        // dependente do servidor; exibição fica consistente
        new Date(
          Date.UTC(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss),
          ),
        );
    return { date, allDay: false };
  }

  return null;
}

/**
 * Divide "KEY;PARAM=X:VALUE" em { key, value }. Ignora parâmetros pois nosso
 * parse simplificado não os usa (TZID, LANGUAGE, etc.).
 */
function parseLine(line: string): { key: string; value: string } | null {
  // o separador chave/valor é o primeiro ":"
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  // na parte esquerda, parâmetros vêm depois de ";"
  const semi = left.indexOf(";");
  const key = (semi === -1 ? left : left.slice(0, semi)).toUpperCase();
  return { key, value };
}

export function parseIcs(raw: string): IcsEvent[] {
  const lines = unfold(raw);
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> & { uid?: string } | null = null;
  let startAllDay = false;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {
        uid: "",
        summary: "",
        description: "",
        location: null,
        start: null,
        end: null,
        allDay: false,
        status: null,
      };
      startAllDay = false;
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.uid) {
        events.push({
          uid: current.uid,
          summary: current.summary ?? "",
          description: current.description ?? "",
          location: current.location ?? null,
          start: current.start ?? null,
          end: current.end ?? null,
          allDay: startAllDay,
          status: current.status ?? null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    switch (parsed.key) {
      case "UID":
        current.uid = parsed.value.trim();
        break;
      case "SUMMARY":
        current.summary = unescapeText(parsed.value);
        break;
      case "DESCRIPTION":
        current.description = unescapeText(parsed.value);
        break;
      case "LOCATION":
        current.location = unescapeText(parsed.value);
        break;
      case "STATUS":
        current.status = parsed.value.trim();
        break;
      case "DTSTART": {
        const d = parseIcsDate(parsed.value);
        if (d) {
          current.start = d.date;
          startAllDay = d.allDay;
        }
        break;
      }
      case "DTEND": {
        const d = parseIcsDate(parsed.value);
        if (d) current.end = d.date;
        break;
      }
    }
  }

  return events;
}

/**
 * Extrai um nome provável de candidato do título do evento.
 *
 * Heurística:
 *  1. Remove prefixos comuns ("Entrevista -", "Candidato:", "Conversa com", etc.)
 *  2. Remove sufixos com " - Vaga X", "(Cliente Y)"
 *  3. Trim
 */
const PREFIXES = [
  /^\s*entrevista\s*[-:–—|]\s*/i,
  /^\s*entrevista\s+com\s+/i,
  /^\s*entrevista\s+/i,
  /^\s*candidato\s*[-:–—|]\s*/i,
  /^\s*candidata\s*[-:–—|]\s*/i,
  /^\s*conversa\s+com\s+/i,
  /^\s*reuni[ãa]o\s+com\s+/i,
  /^\s*call\s+com\s+/i,
  /^\s*call\s*[-:–—|]\s*/i,
];

const SUFFIXES = [
  /\s+[-|–—]\s+vaga\s+.+$/i,
  /\s+\(.+?\)\s*$/,
  /\s+[-|–—]\s+.+$/,
];

export function extrairNomeCandidato(summary: string): string {
  let s = summary.trim();
  for (const rx of PREFIXES) s = s.replace(rx, "");
  for (const rx of SUFFIXES) s = s.replace(rx, "");
  s = s.trim();
  return s;
}
