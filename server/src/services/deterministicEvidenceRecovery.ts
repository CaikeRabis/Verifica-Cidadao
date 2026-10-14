import { extractFactualEntities, compareFactualClaim } from '../lib/factualComparison'
import { selectRelevantWindows } from '../lib/contentWindowing'
import { extractKeywords } from '../lib/queryGeneration'
import type { Claim, RawEvidence, SourceDoc } from '../types'

type RecoveryReason =
  | 'NO_STRUCTURED_CLAIM'
  | 'AMBIGUOUS_WINDOW'
  | 'NO_LITERAL_STRUCTURED_FACT'

export interface DeterministicRecoveryTrace {
  claimId: string
  deterministicEvidenceAttempted: boolean
  deterministicEvidenceRecovered: boolean
  sourceId?: string
  windowId?: string
  quoteStart?: number
  quoteEnd?: number
  structuredMatches: string[]
  recoveryReason: RecoveryReason | 'LITERAL_STRUCTURED_FACT'
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const targetKinds = new Set(['money', 'percentage', 'date', 'number'])

/**
 * Recobra exclusivamente um trecho que já exista, por inteiro, numa janela
 * enviada à IA. Não é um gerador de texto nem uma segunda estratégia de busca.
 */
export function recoverDeterministicEvidence(
  claim: Claim,
  sources: SourceDoc[],
): { evidence?: RawEvidence; trace: DeterministicRecoveryTrace } {
  const claimed = extractFactualEntities(claim.text)
  const target = claimed.filter((entity) => targetKinds.has(entity.kind))
  const years = claimed.filter((entity) => entity.kind === 'year').map((entity) => entity.raw)
  const base: DeterministicRecoveryTrace = {
    claimId: claim.id,
    deterministicEvidenceAttempted: true,
    deterministicEvidenceRecovered: false,
    structuredMatches: [],
    recoveryReason: target.length === 1 ? 'NO_LITERAL_STRUCTURED_FACT' : 'NO_STRUCTURED_CLAIM',
  }
  if (target.length !== 1) return { trace: base }

  const claimWords = extractKeywords(normalize(claim.text)).filter((word) => word.length >= 3 && !/^\d/.test(word))
  const candidates: { source: SourceDoc; windowId: string; quote: string; start: number; end: number; matches: string[]; stance: 'supports' | 'contradicts' }[] = []

  for (const source of sources) {
    if (source.readStatus !== 'read' || !source.text) continue
    const windows = selectRelevantWindows(source.id, source.text, [claim], 6000)
    for (const window of windows) {
      // Frases reais, preservando o texto e as quebras da fonte. Decimais não
      // são delimitadores porque só há quebra após pontuação seguida de espaço.
      const sentences = window.text.split(/(?<=[.!?])\s+/)
      for (const rawSentence of sentences) {
        const quote = rawSentence.trim()
        if (quote.length < 15) continue
        const found = extractFactualEntities(quote)
        const sameKind = found.filter((entity) => entity.kind === target[0].kind)
        const overlap = claimWords.filter((word) => new Set(extractKeywords(normalize(quote))).has(word)).length
        const hasPeriod = years.length === 0 || years.every((year) => quote.includes(year))
        const comparison = hasPeriod && sameKind.length === 1 && overlap >= 2
          ? compareFactualClaim(claim.text, quote)
          : undefined
        // O fallback é de segurança para divergência objetiva já documentada,
        // não um caminho alternativo para confirmar afirmações sem evidência IA.
        if (!comparison || comparison.stance !== 'contradicts') continue
        const start = source.text.indexOf(quote)
        if (start < 0) continue
        candidates.push({ source, windowId: window.windowId, quote, start, end: start + quote.length, matches: found.map((entity) => entity.raw), stance: comparison.stance })
      }
    }
  }

  if (candidates.length !== 1) {
    return { trace: { ...base, recoveryReason: candidates.length > 1 ? 'AMBIGUOUS_WINDOW' : 'NO_LITERAL_STRUCTURED_FACT' } }
  }
  const candidate = candidates[0]
  return {
    evidence: {
      claimId: claim.id,
      sourceId: candidate.source.id,
      windowId: candidate.windowId,
      quote: candidate.quote,
      context: 'Trecho literal recuperado de uma janela lida e validada.',
      stance: candidate.stance,
      foundValue: extractFactualEntities(candidate.quote).find((entity) => entity.kind === target[0].kind)?.raw,
      allegedValue: target[0].raw,
      evidenceSource: 'deterministic-window',
    },
    trace: {
      ...base,
      deterministicEvidenceRecovered: true,
      sourceId: candidate.source.id,
      windowId: candidate.windowId,
      quoteStart: candidate.start,
      quoteEnd: candidate.end,
      structuredMatches: candidate.matches,
      recoveryReason: 'LITERAL_STRUCTURED_FACT',
    },
  }
}
