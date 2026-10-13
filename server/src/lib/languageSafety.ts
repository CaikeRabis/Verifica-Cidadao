/**
 * "A IA não acusa" — camada determinística (2/3 do princípio; as outras duas
 * são o prompt e os textos-modelo da resposta final).
 */

const NEUTRAL_EXPLANATION =
  'As fontes consultadas apresentam divergências ou limitações que exigem leitura cuidadosa. ' +
  'Esta análise não atribui responsabilidade a pessoas, empresas ou órgãos; consulte os documentos originais.'

// imputação direta: "houve fraude", "cometeu crime", "é corrupto", "desviou"...
const DIRECT_ACCUSATION: RegExp[] = [
  /\b(houve|ocorreu|existe|comprovou-se|comprovada|comprovado|configura|caracteriza)\s+(\w+\s+){0,3}(corrup\w+|fraud\w+|crime\w*|desvio\w*|peculato|improbidade|superfaturament\w+|propina\w*|lavagem)/i,
  /\b(cometeu|cometeram|praticou|praticaram|participou|participaram)\s+(\w+\s+){0,4}(corrup\w+|fraud\w+|crime\w*|desvio\w*|ilegalidade\w*|ilícito\w*)/i,
  /\b(desviou|desviaram|fraudou|fraudaram|roubou|roubaram|furtou|furtaram|lavou dinheiro|superfaturou|superfaturaram)\b/i,
  /\b(é|foi|são|foram|está|estão)\s+(\w+\s+){0,2}(corrupt[oa]s?|fraudador\w*|criminos[oa]s?|ladr[aã]o|ladr[õo]es|culpad[oa]s?|bandid\w+)\b/i,
  /\bculpa(d[oa]s?)?\s+(d[oa]s?|pel[oa]s?)\b/i,
]

export function containsAccusation(text: string): boolean {
  return DIRECT_ACCUSATION.some((re) => re.test(text))
}

/** Termos que tornam a *afirmação do usuário* sensível (não confirmar automaticamente). */
const SENSITIVE_TERMS =
  /(corrup\w+|fraud\w+|\bcrime\w*|criminos\w+|desvi\w+|propina\w*|roubo\w*|roubou|lavagem|superfatur\w+|improbidade|peculato|caixa dois|suborn\w+|culpad\w+)/i

export function isSensitiveClaim(text: string): boolean {
  return SENSITIVE_TERMS.test(text)
}

/** Retorna o texto original ou uma versão neutra se houver imputação direta. */
export function guardText(text: string, fallback = NEUTRAL_EXPLANATION): { text: string; replaced: boolean } {
  if (containsAccusation(text)) return { text: fallback, replaced: true }
  return { text, replaced: false }
}

export { NEUTRAL_EXPLANATION }
