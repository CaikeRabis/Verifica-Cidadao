import { guardText } from '../lib/languageSafety'
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
    if (e.stance === 'insufficient') continue // lida, mas irrelevante: não é exibida como evidência
    const key = `${e.claimId}|${e.sourceId}|${norm(e.quote)}`
    if (seen.has(key) || (perClaim.get(e.claimId) ?? 0) >= 4) continue
    seen.add(key)
    perClaim.set(e.claimId, (perClaim.get(e.claimId) ?? 0) + 1)

    // valores só são mantidos se aparecem no texto lido
    const inText = (v?: string) => (v && norm(source!.text!).includes(norm(v)) ? v : undefined)
    const context = e.context ? guardText(e.context, 'Trecho da fonte relacionado à afirmação analisada.').text : ''
    valid.push({
      ...e,
      context,
      foundValue: inText(e.foundValue),
      allegedValue: e.allegedValue && norm(claims.find((c) => c.id === e.claimId)!.text).includes(norm(e.allegedValue)) ? e.allegedValue : undefined,
      id: `e${valid.length + 1}`,
      tier: source!.tier,
    })
  }
  return { valid, discarded }
}
