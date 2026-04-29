/**
 * Forma de linha do cliente usada nas listas/cards (derivada de
 * prisma.cliente.findMany com _count e vagas abertas).
 */
export interface ClienteRow {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  emailPrincipal: string | null;
  telefone: string | null;
  segmento: string | null;
  ativo: boolean;
  createdAt: Date;
  _count: { vagas: number };
  vagasAbertas: number;
}

