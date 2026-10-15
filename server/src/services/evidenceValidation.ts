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
  return locateQuote(quote, text) !== undefined || (norm(quote).length >= 15 && norm(text).includes(norm(quote)))
}

export interface QuoteLocation { start: number; end: number; match: 'exact' | 'formatting' }

/** Localização literal, tolerando somente apresentação HTML/Unicode e espaços. */
export function locateQuote(quote: string, text: string): QuoteLocation | undefined {
  if (quote.trim().length < 15) return undefined
  const exact = text.indexOf(quote)
  if (exact >= 0) return { start: exact, end: exact + quote.length, match: 'exact' }
  const compact = (value: string) => value.normalize('NFC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  const q = compact(quote)
  const chars: string[] = []
  const offsets: number[] = []
  let previousSpace = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].normalize('NFC')
    if (/\s/.test(ch) || ch === '\u00a0') {
      if (!previousSpace) { chars.push(' '); offsets.push(i); previousSpace = true }
    } else { chars.push(ch); offsets.push(i); previousSpace = false }
  }
  const normalized = chars.join('').trim()
  const start = normalized.indexOf(q)
  if (start < 0) return undefined
  const leading = chars.findIndex((char) => char !== ' ')
  const mappedStart = offsets[start + Math.max(leading, 0)]
  const mappedEnd = offsets[Math.min(offsets.length - 1, start + Math.max(leading, 0) + q.length - 1)] + 1
  return { start: mappedStart, end: mappedEnd, match: 'formatting' }
}

export interface ValidationResult {
  valid: ValidEvidence[]
  discarded: number
}

export type EvidenceRejectionReason =
  | 'INVALID_STRUCTURE' | 'CLAIM_MISMATCH' | 'INVALID_SOURCE' | 'SOURCE_NOT_READ'
  | 'QUOTE_NOT_FOUND' | 'LOW_LEXICAL_RELEVANCE' | 'ENTITY_MISMATCH'
  | 'QUOTE_NOT_IN_WINDOW' | 'QUOTE_NOT_IN_SOURCE' | 'INVALID_WINDOW_ID'
  | 'HISTORICAL_CONTEXT_MISMATCH' | 'DUPLICATE' | 'ANALYZED_SOURCE_SELF_REFERENCE' | 'OTHER'

export interface EvidenceValidationObserver {
  candidate: (item: { claimId: string; sourceId: string; windowId?: string; quote: string; context: string; stanceFromAI: RawEvidence['stance']; structuredEntities: ReturnType<typeof extractFactualEntities> }) => void
  rejected: (item: { claimId: string; sourceId: string; quote: string; reason: EvidenceRejectionReason; relevanceChecks?: Record<string, boolean | number | string> }) => void
  accepted: (item: ValidEvidence & { stanceFromAI: RawEvidence['stance']; relevanceChecks: Record<string, boolean | number | string> }) => void
}

type TemporalMode = 'current' | 'historical' | 'explicit-period' | 'unspecified'

const CURRENT_CONTEXT = /\b(atualmente|hoje|em vigor|possui|tem|conta com|[ée]\s+composto\s+por)\b/i
const HISTORICAL_CONTEXT = /\b(no\s+in[ií]cio(?:\s+da|\s+do)?|inicial|hist[oó]ric[oa]|antig[oa]|[àa]\s+época|naquele\s+(?:per[ií]odo|ano)|anteriormente|originalmente|at[eé]\s+(?:1[5-9]|20)\d{2}|durante\s+(?:o|a))\b/i
const YEAR = /\b(?:1[5-9]|20)\d{2}\b/g

const yearsIn = (text: string) => [...text.matchAll(YEAR)].map((match) => Number(match[0]))

/**
 * Distingue o tempo do fato narrado da data de publicação da página. Uma
 * passagem pode ser atual e mencionar sua origem histórica; nesse caso o
 * predicado atual torna a passagem aplicável à alegação presente.
 */
export function temporalApplicability(claim: Claim, quote: string, sourceText = '') {
  const claimYears = yearsIn(claim.text)
  const quoteYears = yearsIn(quote)
  const sourceYears = yearsIn(sourceText)
  const claimMode: TemporalMode = claimYears.length > 0 || claim.context?.temporal?.year
    ? 'explicit-period'
    : CURRENT_CONTEXT.test(claim.text) ? 'current' : 'unspecified'
  const evidenceMode: TemporalMode = CURRENT_CONTEXT.test(quote)
    ? 'current'
    : (HISTORICAL_CONTEXT.test(quote) || quoteYears.length > 0) ? 'historical' : 'unspecified'
  const claimedYear = claim.context?.temporal?.year ?? claimYears[0]
  const evidenceYears = quoteYears.length > 0 ? quoteYears : sourceYears
  const currentVsHistorical = claimMode === 'current' && evidenceMode === 'historical'
  // Quando o ano é o próprio fato comparado ("promulgada em 1989"), 1988
  // deve contradizer 1989. O bloqueio vale para períodos que qualificam outro
  // valor factual, como moeda, percentual ou contagem.
  const periodQualifiesAnotherValue = extractFactualEntities(claim.text).some((entity) => ['money', 'percentage', 'number'].includes(entity.kind))
  const explicitYearMismatch = claimMode === 'explicit-period' && periodQualifiesAnotherValue && !!claimedYear && evidenceYears.length > 0 && !evidenceYears.includes(claimedYear)
  // Contexto herdado da primary representa um período explícito do conteúdo
  // URL; a página inteira pode trazer ano de outro fato quando o quote não o
  // repete, portanto preservamos a proteção já existente.
  const inheritedYearMismatch = claim.context?.temporal?.source === 'inherited-primary' && !!claimedYear && sourceYears.some((year) => year !== claimedYear) && !sourceYears.includes(claimedYear)
  const applicable = !(currentVsHistorical || explicitYearMismatch || inheritedYearMismatch)
  return { claimMode, evidenceMode, applicable, claimedYear, evidenceYears, currentVsHistorical, explicitYearMismatch, inheritedYearMismatch }
}
const ALIASES: [RegExp, string][] = [
  [/\bsupremo tribunal federal\b/gi, 'stf'], [/\bsenado federal\b/gi, 'senado'],
  [/\bc[aâ]mara dos deputados\b/gi, 'camara'], [/\bsistema [úu]nico de sa[úu]de\b/gi, 'sus'],
  [/\bdistrito federal\b/gi, 'df'], [/\b(?:possui|tem)\b/gi, 'composicao'], [/\b[ée] composto por\b/gi, 'composicao'],
]
const canonical = (text: string) => ALIASES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)

/** Relevância mínima: a fonte pode ser confiável, mas ainda não responder à claim. */
function relevance(claim: Claim, quote: string, factual: ReturnType<typeof compareFactualClaim>, sourceText = '', temporal = temporalApplicability(claim, quote, sourceText)) {
  const normalizedClaim = canonical(claim.text)
  const normalizedQuote = canonical(quote)
  const claimWords = extractKeywords(normalizedClaim).filter((word) => word.length >= 3 && !/^\d/.test(word))
  const quoteWords = new Set(extractKeywords(normalizedQuote))
  const overlap = claimWords.filter((word) => quoteWords.has(word)).length
  const numericRequired = extractFactualEntities(claim.text).length > 0
  const componentFactual = compareFactualClaim(normalizedClaim, normalizedQuote)
  const entityMatch = claimWords.some((word) => ['stf', 'senado', 'camara', 'sus', 'df'].includes(word) && quoteWords.has(word))
  const objectMatch = claimWords.filter((word) => !['stf', 'senado', 'camara', 'sus', 'df'].includes(word)).some((word) => quoteWords.has(word))
  const valueMatch = !!(factual ?? componentFactual)
  const checks = { lexicalOverlap: overlap >= 2, lexicalOverlapCount: overlap, entityMatch, aliasMatch: entityMatch, objectMatch, valueMatch, temporalMatch: temporal.applicable, lexicalMatch: overlap >= 2, numericRequired, historicalConflict: !temporal.applicable, claimTemporalMode: temporal.claimMode, evidenceTemporalMode: temporal.evidenceMode, temporalApplicable: temporal.applicable }
  if (!temporal.applicable) return { ok: false, reason: 'HISTORICAL_CONTEXT_MISMATCH' as const, checks }
  if (overlap < 2 && !(entityMatch && objectMatch && valueMatch)) return { ok: false, reason: 'LOW_LEXICAL_RELEVANCE' as const, checks }

  // Claims quantitativas exigem comparação objetiva; texto com número em outro
  // contexto (ou número por extenso) não pode virar suporte por decisão da IA.
  if (numericRequired && !(factual ?? componentFactual)) return { ok: false, reason: 'ENTITY_MISMATCH' as const, checks }
  return { ok: true, checks }
}

/**
 * Validação programática obrigatória: descarta evidência com claim/fonte
 * desconhecidos, fonte NÃO lida, stance 'insufficient' ou quote inexistente.
 * Permite também que uma evidência comprovada se relacione a mais de uma claim
 * quando o trecho contiver os termos essenciais de ambas.
 */
export function validateEvidences(raw: RawEvidence[], claims: Claim[], sources: SourceDoc[], observer?: EvidenceValidationObserver): ValidationResult {
  const claimIds = new Set(claims.map((c) => c.id))
  const bySource = new Map(sources.map((s) => [s.id, s]))
  const valid: ValidEvidence[] = []
  const seen = new Set<string>()
  const perClaim = new Map<string, number>()
  let discarded = 0

  for (const e of raw) {
    const source = bySource.get(e.sourceId)
    observer?.candidate({ ...e, stanceFromAI: e.stance, structuredEntities: extractFactualEntities(e.quote) })
    if (!claimIds.has(e.claimId)) { discarded++; observer?.rejected({ ...e, reason: 'CLAIM_MISMATCH' }); continue }
    if (!source) { discarded++; observer?.rejected({ ...e, reason: 'INVALID_SOURCE' }); continue }
    if (source.readStatus !== 'read' || !source.text) { discarded++; observer?.rejected({ ...e, reason: 'SOURCE_NOT_READ' }); continue }
    if (!quoteExistsIn(e.quote, source.text)) { discarded++; observer?.rejected({ ...e, reason: 'QUOTE_NOT_IN_SOURCE' }); continue }
    const claim = claims.find((c) => c.id === e.claimId)!
    const temporal = temporalApplicability(claim, e.quote, source.text)
    // Aplicabilidade temporal vem antes da comparação numérica: um valor
    // verdadeiro em período histórico não decide uma alegação atual.
    const factual = temporal.applicable ? compareFactualClaim(canonical(claim.text), canonical(e.quote)) : undefined
    // Um número incompatível em tema correlato não contradiz, por si só, uma
    // alegação institucional subespecificada. Se a IA marcou o trecho como
    // insuficiente e não há entidade institucional compartilhada, preserva-se
    // essa cautela em vez de promover para contradita deterministicamente.
    const lacksInstitutionalEntity = !extractKeywords(canonical(claim.text)).some((word) => ['stf', 'senado', 'camara', 'sus', 'df'].includes(word) && extractKeywords(canonical(e.quote)).includes(word))
    const stance = factual?.stance === 'contradicts' && e.stance === 'insufficient' && lacksInstitutionalEntity
      ? 'insufficient'
      : factual?.stance ?? e.stance
    const relevanceResult = relevance(claim, e.quote, factual, source.text, temporal)
    if (!relevanceResult.ok) {
      discarded++
      observer?.rejected({ ...e, reason: relevanceResult.reason!, relevanceChecks: relevanceResult.checks })
      continue
    }
    if (stance === 'insufficient') continue // lida, mas irrelevante: não é exibida como evidência
    const key = `${e.claimId}|${e.sourceId}|${norm(e.quote)}`
    if (seen.has(key) || (perClaim.get(e.claimId) ?? 0) >= 4) { observer?.rejected({ ...e, reason: 'DUPLICATE', relevanceChecks: relevanceResult.checks }); continue }
    seen.add(key)
    perClaim.set(e.claimId, (perClaim.get(e.claimId) ?? 0) + 1)

    // valores só são mantidos se aparecem no texto lido
    const inText = (v?: string) => (v && norm(source!.text!).includes(norm(v)) ? v : undefined)
    const context = e.context ? guardText(e.context, 'Trecho da fonte relacionado à afirmação analisada.').text : ''
    const accepted: ValidEvidence = {
      ...e,
      stance,
      context,
      foundValue: inText(e.foundValue),
      allegedValue: e.allegedValue && norm(claim.text).includes(norm(e.allegedValue)) ? e.allegedValue : undefined,
      id: `e${valid.length + 1}`,
      tier: source!.tier,
      stanceSource: factual ? 'deterministic' : 'ai',
      evidenceSource: e.evidenceSource ?? 'ai',
    }
    valid.push(accepted)
    observer?.accepted({ ...accepted, stanceFromAI: e.stance, relevanceChecks: relevanceResult.checks })
  }

  return { valid, discarded }
}
