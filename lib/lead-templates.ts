/**
 * Helpers pra montar links de WhatsApp/Email a partir dos templates de
 * mensagem cadastrados pelo admin. Templates suportam placeholders
 * {{nome}}, {{empresa}}, {{contatoNome}}, {{cargoInteresse}}, {{recrutadora}}.
 *
 * O fluxo do comercial CapTalento RH é consultivo:
 *  1. Lead chega (site ou manual) → Saudação inicial via WhatsApp
 *  2. Diagnóstico via WhatsApp (entender vaga, volume, urgência, orçamento)
 *  3. Proposta enviada por email (template de proposta formal)
 *  4. Follow-ups 3d/7d se não responder
 *  5. Fechamento → vira Cliente, abre Vaga
 */

export interface LeadPlaceholders {
  nome?: string | null;
  empresa?: string | null;
  contatoNome?: string | null;
  cargoInteresse?: string | null;
  recrutadora?: string | null;
}

/**
 * Substitui placeholders {{x}} no corpo. Valores ausentes viram string
 * vazia (silencioso) pra não imprimir "{{nome}}" no WhatsApp do lead.
 */
export function aplicarPlaceholders(
  corpo: string,
  data: LeadPlaceholders,
): string {
  const map: Record<string, string> = {
    nome: data.nome ?? data.contatoNome ?? "",
    empresa: data.empresa ?? "",
    contatoNome: data.contatoNome ?? "",
    cargoInteresse: data.cargoInteresse ?? "",
    recrutadora: data.recrutadora ?? "",
  };
  return corpo.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key) => {
    return map[key] !== undefined ? map[key] : "";
  });
}

/**
 * Normaliza um telefone brasileiro pra E.164 sem o "+":
 *  - "(41) 99999-8888" → "5541999998888"
 *  - "+55 41 99999-8888" → "5541999998888"
 *  - "9999988888" → "559999988888" (presume DDD nos 2 primeiros dígitos)
 *
 * Retorna null se ficar com menos de 10 dígitos (DDD + 8). Ignora ramais
 * e formatações.
 */
export function telefoneParaWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  let digits = telefone.replace(/\D+/g, "");
  if (digits.length === 0) return null;
  // Já tem código do país?
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }
  // Tem DDD + número (10 ou 11 dígitos) — adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  // Outros casos: tenta como veio
  if (digits.length >= 10) return digits;
  return null;
}

/**
 * Monta a URL `https://wa.me/{numero}?text={texto}` que abre o WhatsApp
 * (web ou app) com mensagem pré-preenchida.
 */
export function whatsAppUrl(
  telefone: string | null | undefined,
  texto: string,
): string | null {
  const numero = telefoneParaWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/**
 * Monta a URL `mailto:` com assunto e corpo pré-preenchidos.
 */
export function mailtoUrl(
  email: string | null | undefined,
  assunto: string,
  corpo: string,
): string | null {
  if (!email || !email.includes("@")) return null;
  const params = new URLSearchParams();
  if (assunto) params.set("subject", assunto);
  if (corpo) params.set("body", corpo);
  const qs = params.toString();
  return qs.length > 0 ? `mailto:${email}?${qs}` : `mailto:${email}`;
}

/**
 * Templates default pra serem inseridos pelo seed inicial. Cliente pode
 * editar/desativar pelo /admin/templates depois.
 */
export const TEMPLATES_DEFAULT = [
  {
    nome: "1. Saudação inicial",
    canal: "whatsapp" as const,
    ordem: 10,
    corpo: `Olá {{nome}}, tudo bem? Aqui é {{recrutadora}} da CapTalento RH 👋

Vi que vocês têm interesse em apoio na contratação{{cargoInteresse}} e queria entender melhor a necessidade pra te apresentar como podemos ajudar.

Você tem 5 minutinhos pra eu te fazer algumas perguntas rápidas?`,
  },
  {
    nome: "2. Diagnóstico — qualificação",
    canal: "whatsapp" as const,
    ordem: 20,
    corpo: `Pra eu montar a melhor proposta pra {{empresa}}, me ajuda com 4 informações?

1. Qual cargo/posição vocês precisam preencher?
2. É 1 vaga ou um pacote (2-5, 6+)?
3. Qual a urgência? (imediata, 30d, 60d)
4. Modalidade da contratação? (CLT / PJ / autônomo)

Pode me responder o que souber, depois a gente afina os detalhes.`,
  },
  {
    nome: "3. Pré-proposta — apresentação",
    canal: "whatsapp" as const,
    ordem: 30,
    corpo: `Perfeito, {{nome}}!

Aqui na CapTalento a gente trabalha com modelo consultivo: cuidamos do funil inteiro (triagem, entrevistas, shortlist) e entregamos os 3-5 melhores candidatos com fit pra vaga.

Você prefere que eu mande a proposta formal por email pra você analisar com calma, ou seguimos por aqui mesmo?

Me confirma o melhor email pra eu enviar 🙌`,
  },
  {
    nome: "Follow-up 3 dias",
    canal: "whatsapp" as const,
    ordem: 40,
    corpo: `Oi {{nome}}, tudo bem?

Só passando pra ver se conseguiu olhar a proposta da CapTalento. Tem alguma dúvida que eu posso esclarecer?`,
  },
  {
    nome: "Follow-up 7 dias",
    canal: "whatsapp" as const,
    ordem: 50,
    corpo: `Oi {{nome}}, tudo bem?

Sei que a rotina aperta. A proposta pra {{empresa}} ainda está válida — me avisa se faz sentido seguirmos ou se prefere encerrar por agora. Qualquer caminho tá ok 👍`,
  },
  {
    nome: "Fechamento",
    canal: "whatsapp" as const,
    ordem: 60,
    corpo: `Que ótimo, {{nome}}! Vou preparar tudo do nosso lado.

Vou te mandar agora o link com os próximos passos (briefing detalhado da vaga + dados pra cobrança). Assim que confirmar, já começamos a trabalhar 🚀`,
  },
  {
    nome: "Proposta comercial",
    canal: "email" as const,
    ordem: 10,
    assunto: "Proposta CapTalento RH — {{empresa}}",
    corpo: `Olá {{contatoNome}},

Conforme conversamos, segue a proposta da CapTalento RH para apoiá-los na contratação{{cargoInteresse}}.

== Sobre nós ==
A CapTalento é uma consultoria especializada em recrutamento e seleção. Cuidamos do processo completo (triagem, entrevistas, validação técnica e shortlist) e entregamos os melhores candidatos com fit cultural e técnico.

== Como funcionamos ==
1. Briefing aprofundado da vaga (1 reunião)
2. Triagem ativa em nossa base de talentos + canais externos
3. Entrevistas estruturadas
4. Entrega de shortlist com 3-5 candidatos
5. Acompanhamento até a contratação

== Investimento ==
[Inserir valores e condições]

== Garantias ==
- Reposição gratuita se o candidato sair na experiência
- Acompanhamento pós-contratação por 30 dias

Fico à disposição pra qualquer dúvida.

{{recrutadora}}
CapTalento RH`,
  },
] as const;
