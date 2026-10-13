import { isSensitiveClaim } from '../lib/languageSafety'
import { TIER_WEIGHT } from '../lib/sourceRanking'
import type { Claim, Classification, ConfidenceLevel, ValidEvidence } from '../types'

/**
 * Regras de classificação v0.1.1 — centralizadas aqui para evoluir depois.
 * A IA só informa a relação de cada trecho (supports/contradicts/...);
 * quem decide a classificação são ESTAS regras determinísticas.
 */

export interface ClassifyInput {
  claims: Claim[]
  evidences: ValidEvidence[]
  /** Nenhuma fonte pôde ser lida (falha importante do pipeline). */
  noSourcesRead?: boolean
}

export interface ClassifyOutput {
  classification: Classification
  confidence: ConfidenceLevel
  confidenceExplanation: string
  claimStatus: Record<string, Classification>
  /** Motivo (texto neutro) quando o resultado é "analise-humana". */
  humanReason?: string
}

interface ClaimVerdict {
  status: Classification
  reason?: string
}

const maxWeight = (evs: ValidEvidence[]) => Math.max(0, ...evs.map((e) => TIER_WEIGHT[e.tier]))

export function classifyClaim(claim: Claim, evidences: ValidEvidence[]): ClaimVerdict {
  const mine = evidences.filter((e) => e.claimId === claim.id)
  const sup = mine.filter((e) => e.stance === 'supports')
  const con = mine.filter((e) => e.stance === 'contradicts')
  const unc = mine.filter((e) => e.stance === 'unclear')
  const sensitive = isSensitiveClaim(claim.text)

  const confirmed = (): ClaimVerdict =>
    sensitive
      ? { status: 'analise-humana', reason: 'A afirmação trata de tema sensível e exige confirmação adicional antes de qualquer conclusão.' }
      : { status: 'confirmada' }

  if (sup.length > 0 && con.length > 0) {
    const s = maxWeight(sup)
    const c = maxWeight(con)
    if (c > s && c >= TIER_WEIGHT.jornalismo) return { status: 'contradita' }
    if (s > c && s >= TIER_WEIGHT.jornalismo) return confirmed()
    return { status: 'analise-humana', reason: 'Fontes de qualidade semelhante apresentam informações conflitantes.' }
  }
  if (sup.length > 0) {
    return maxWeight(sup) >= TIER_WEIGHT.jornalismo ? confirmed() : { status: 'sem-evidencias' }
  }
  if (con.length > 0) {
    return maxWeight(con) >= TIER_WEIGHT.jornalismo
      ? { status: 'contradita' }
      : { status: 'analise-humana', reason: 'A divergência apareceu apenas em fonte de menor confiabilidade.' }
  }
  if (unc.length > 0) return { status: 'analise-humana', reason: 'Os trechos encontrados são ambíguos para uma conclusão segura.' }
  return { status: 'sem-evidencias' }
}

export function classify(input: ClassifyInput): ClassifyOutput {
  const { claims, evidences } = input
  const human = (reason: string): ClassifyOutput => ({
    classification: 'analise-humana',
    confidence: 'baixa',
    confidenceExplanation: 'Pouca base documental para uma conclusão: o resultado depende de leitura humana das fontes.',
    claimStatus: Object.fromEntries(claims.map((c) => [c.id, 'analise-humana' as Classification])),
    humanReason: reason,
  })

  if (claims.length === 0) {
    return human('Não identificamos uma afirmação factual que possa ser verificada em fontes públicas (o texto pode ser opinião ou conteúdo subjetivo).')
  }
  if (input.noSourcesRead) {
    return human('Não foi possível ler nenhuma fonte pública relacionada, então não há base segura para uma conclusão.')
  }

  const verdicts = claims.map((c) => classifyClaim(c, evidences))
  const claimStatus = Object.fromEntries(claims.map((c, i) => [c.id, verdicts[i].status]))
  const set = new Set(verdicts.map((v) => v.status))
  const decisive = verdicts.filter((v) => v.status === 'confirmada' || v.status === 'contradita')

  let classification: Classification
  if (set.size === 1) {
    classification = verdicts[0].status
  } else if (decisive.length === 0) {
    classification = set.has('analise-humana') ? 'analise-humana' : 'sem-evidencias'
  } else {
    classification = 'parcialmente-confirmada'
  }

  if (classification === 'analise-humana') {
    const reason = verdicts.find((v) => v.reason)?.reason ?? 'O resultado é ambíguo e exige interpretação ou confirmação adicional.'
    return { ...human(reason), claimStatus }
  }

  // ---- Robustez ----
  const decisiveEv = evidences.filter((e) => e.stance === 'supports' || e.stance === 'contradicts')
  const hasOfficial = decisiveEv.some((e) => e.tier === 'oficial')
  const domains = new Set(decisiveEv.map((e) => e.sourceId)).size
  const opposing = evidences.some((e) => e.stance === 'supports') && evidences.some((e) => e.stance === 'contradicts')

  let confidence: ConfidenceLevel
  if (classification === 'sem-evidencias') {
    confidence = 'baixa'
  } else if (classification === 'parcialmente-confirmada') {
    confidence = hasOfficial || domains >= 2 ? 'media' : 'baixa'
  } else {
    confidence = (hasOfficial || domains >= 2) && !opposing ? 'alta' : 'media'
  }

  const confidenceExplanation: Record<ConfidenceLevel, string> = {
    alta: 'Há trechos claros em fonte oficial ou em mais de uma fonte lida, sem evidência relevante em sentido oposto.',
    media: 'Há trechos úteis, mas dependem de poucas fontes, de fontes não oficiais ou há sinais em sentido oposto.',
    baixa: 'Poucos trechos relevantes foram encontrados nas fontes lidas, ou as fontes são de menor confiabilidade.',
  }

  return { classification, confidence, confidenceExplanation: confidenceExplanation[confidence], claimStatus }
}
