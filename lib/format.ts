/**
 * Formata um CNPJ no padrão "XX.XXX.XXX/XXXX-XX".
 * Aceita string com ou sem máscara. Se a entrada não contiver exatamente
 * 14 dígitos, retorna o valor original (sem quebrar a UI).
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const digits = cnpj.replace(/\D+/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
    5,
    8,
  )}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata um CPF no padrão "XXX.XXX.XXX-XX".
 * Aceita string com ou sem máscara. Se a entrada não contiver exatamente
 * 11 dígitos, retorna o valor original (sem quebrar a UI).
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D+/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9, 11)}`;
}

/**
 * Formata um telefone brasileiro nas máscaras usuais:
 *  - 10 dígitos → "(XX) XXXX-XXXX"
 *  - 11 dígitos → "(XX) XXXXX-XXXX"
 * Se não bater, devolve o valor original.
 */
export function formatPhone(telefone: string | null | undefined): string {
  if (!telefone) return "";
  const digits = telefone.replace(/\D+/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(
      7,
      11,
    )}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(
      6,
      10,
    )}`;
  }
  return telefone;
}

/**
 * Devolve as iniciais (1 ou 2 letras maiúsculas) de um nome.
 * Usado em avatares de clientes, usuários, etc.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !/^(de|da|do|das|dos|e)$/i.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
