import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

/**
 * Criptografia simétrica AES-256-GCM para segredos curtos (tipicamente a URL
 * secreta do calendário Google). A chave é derivada determinísticamente do
 * NEXTAUTH_SECRET via scrypt, então o mesmo secret descriptografa valores
 * já gravados — rotacionar NEXTAUTH_SECRET invalida os valores existentes.
 *
 * Formato de saída (base64): IV(12) + TAG(16) + CIPHERTEXT — concatenados.
 */

const ALG = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SCRYPT_SALT = "captalento-rh.v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "NEXTAUTH_SECRET não configurado — criptografia de segredos indisponível.",
    );
  }
  cachedKey = scryptSync(secret, SCRYPT_SALT, KEY_LEN);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Payload criptografado inválido");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Mascara uma URL pra exibir na UI sem vazar o segredo.
 * Ex.: https://calendar.google.com/.../abc123/basic.ics  → https://calendar.google.com/.../•••123/basic.ics
 */
export function maskIcsUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    // O segredo fica num dos últimos segmentos. Mascaramos todos exceto os
    // 3 últimos caracteres do maior segmento não vazio.
    const maxIdx = parts.reduce(
      (acc, seg, i) => (seg.length > parts[acc].length ? i : acc),
      0,
    );
    const secret = parts[maxIdx];
    if (secret && secret.length > 6) {
      parts[maxIdx] = "•".repeat(secret.length - 3) + secret.slice(-3);
    }
    return `${u.origin}${parts.join("/")}`;
  } catch {
    return "•••";
  }
}
