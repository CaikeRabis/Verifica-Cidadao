import { guardText } from '../lib/languageSafety'
import { extractKeywords } from '../lib/queryGeneration'
import { compareFactualClaim } from '../lib/factualComparison'
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

  // Agregação inteligente de claims: se uma evidência de suporte cobre semanticamente
  // outra claim que ainda não tem evidência, associa a evidência também a ela.
  for (const otherClaim of claims) {
    if (valid.some((v) => v.claimId === otherClaim.id)) continue
    const otherKeywords = extractKeywords(otherClaim.text)
    if (otherKeywords.length === 0) continue

    for (const v of [...valid]) {
      if (v.stance !== 'supports') continue
      const qNorm = norm(v.quote)
      const matchCount = otherKeywords.filter((kw) => qNorm.includes(kw)).length
      if (matchCount >= Math.min(2, otherKeywords.length)) {
        const key = `${otherClaim.id}|${v.sourceId}|${norm(v.quote)}`
        if (seen.has(key)) continue
        seen.add(key)
        valid.push({
          ...v,
          id: `e${valid.length + 1}`,
          claimId: otherClaim.id,
          context: `Trecho da mesma fonte documental que também respalda a afirmação analisada.`,
        })
        break
      }
    }
  }

  return { valid, discarded }
}
