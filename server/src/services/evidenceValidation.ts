import { guardText } from '../lib/languageSafety'
import { extractKeywords } from '../lib/queryGeneration'
import { compareFactualClaim, extractFactualEntities } from '../lib/factualComparison'
import type { Claim, RawEvidence, SourceDoc, ValidEvidence } from '../types'

const norm = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[“”„"«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** O quote precisa existir literalmente (ignorando espaços, caixa e tipo de aspas) no texto lido. */
export function quoteExistsIn(quote: string, text: string): boolean {
  const q = norm(quote)
  return q.length >= 15 && norm(text).includes(q)
}

export interface ValidationResult {
  valid: ValidEvidence[]
  discarded: number
}

const HISTORICAL_CONTEXT = /\b(inicial|hist[oó]ric[oa]|antig[oa]|[àa]\s+época|originalmente)\b/i

/** Relevância mínima: a fonte pode ser confiável, mas ainda não responder à claim. */
function isRelevantToClaim(claim: Claim, quote: string, stance: RawEvidence['stance'], factual: ReturnType<typeof compareFactualClaim>): boolean {
  const claimWords = extractKeywords(claim.text).filter((word) => word.length >= 3 && !/^\d/.test(word))
  const quoteWords = new Set(extractKeywords(quote))
  const overlap = claimWords.filter((word) => quoteWords.has(word)).length
  if (overlap < 2) return false

  // Claims quantitativas exigem comparação objetiva; texto com número em outro
  // contexto (ou número por extenso) não pode virar suporte por decisão da IA.
  if (extractFactualEntities(claim.text).length > 0 && !factual) return false
  // Uma composição histórica não comprova a composição atual quando a claim não
  // traz esse recorte temporal.
  if (stance === 'supports' && HISTORICAL_CONTEXT.test(quote) && !HISTORICAL_CONTEXT.test(claim.text)) return false
  return true
}

/**
 * Validação programática obrigatória: descarta evidência com claim/fonte
 * desconhecidos, fonte NÃO lida, stance 'insufficient' ou quote inexistente.
 * Permite também que uma evidência comprovada se relacione a mais de uma claim
 * quando o trecho contiver os termos essenciais de ambas.
 */
export function validateEvidences(raw: RawEvidence[], claims: Claim[], sources: SourceDoc[]): ValidationResult {
  const claimIds = new Set(claims.map((c) => c.id))
  const bySource = new Map(sources.map((s) => [s.id, s]))
  const valid: ValidEvidence[] = []
  const seen = new Set<string>()
  const perClaim = new Map<string, number>()
  let discarded = 0

  for (const e of raw) {
    const source = bySource.get(e.sourceId)
    const ok =
      claimIds.has(e.claimId) &&
      !!source &&
      source.readStatus === 'read' &&
      !!source.text &&
      quoteExistsIn(e.quote, source.text)
    if (!ok) {
      discarded++
      continue
    }
    const claim = claims.find((c) => c.id === e.claimId)!
    const factual = compareFactualClaim(claim.text, e.quote)
    const stance = factual?.stance ?? e.stance
    if (!isRelevantToClaim(claim, e.quote, stance, factual)) {
      discarded++
      continue
    }
    if (stance === 'insufficient') continue // lida, mas irrelevante: não é exibida como evidência
    const key = `${e.claimId}|${e.sourceId}|${norm(e.quote)}`
    if (seen.has(key) || (perClaim.get(e.claimId) ?? 0) >= 4) continue
    seen.add(key)
    perClaim.set(e.claimId, (perClaim.get(e.claimId) ?? 0) + 1)

    // valores só são mantidos se aparecem no texto lido
    const inText = (v?: string) => (v && norm(source!.text!).includes(norm(v)) ? v : undefined)
    const context = e.context ? guardText(e.context, 'Trecho da fonte relacionado à afirmação analisada.').text : ''
    valid.push({
      ...e,
      stance,
      context,
      foundValue: inText(e.foundValue),
      allegedValue: e.allegedValue && norm(claim.text).includes(norm(e.allegedValue)) ? e.allegedValue : undefined,
      id: `e${valid.length + 1}`,
      tier: source!.tier,
      stanceSource: factual ? 'deterministic' : 'ai',
    })
  }

  return { valid, discarded }
}
