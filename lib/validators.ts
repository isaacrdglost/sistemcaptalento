import { z } from "zod";

/**
 * CNPJ opcional: aceita string com qualquer máscara, normaliza pra dígitos.
 * Quando vazio, vira null. Quando informado, exige 14 dígitos.
 *
 * Reaproveitado em Cliente, Lead e qualquer entidade que receba CNPJ no MVP.
 * Validação de DV (dígitos verificadores) ficou fora — pode ser adicionado
 * sem quebrar quem já chama.
 */
export const cnpjOptional = z
  .string()
  .trim()
  .max(20)
  .nullable()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const digits = v.replace(/\D+/g, "");
    return digits.length === 0 ? null : digits;
  })
  .refine((v) => v === null || v.length === 14, {
    message: "CNPJ deve ter 14 dígitos",
  });

/**
 * URL opcional http/https. String vazia também é tratada como null.
 */
export const urlOrNullOptional = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional()
  .refine(
    (v) => {
      if (v === null || v === undefined) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL inválida" },
  );

/**
 * Email opcional — vazio vira null, normaliza pra lowercase.
 */
export const emailOptional = z
  .string()
  .trim()
  .nullable()
  .or(z.literal(""))
  .optional()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine(
    (v) => {
      if (v === null) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    },
    { message: "Email inválido" },
  );
