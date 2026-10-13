import type { PIPELINE_VERSION } from './version'

export type Classification =
  | 'confirmada'
  | 'parcialmente-confirmada'
  | 'sem-evidencias'
  | 'contradita'
  | 'analise-humana'

export type ConfidenceLevel = 'alta' | 'media' | 'baixa'
export type ReadStatus = 'read' | 'snippet-only' | 'unavailable'
export type SourceTier = 'oficial' | 'jornalismo' | 'outro'
export type Stance = 'supports' | 'contradicts' | 'insufficient' | 'unclear'
export type StanceSource = 'ai' | 'deterministic'
export type ClaimRole = 'primary' | 'secondary'

export interface SearchResult {
  title: string
  url: string
  domain: string
  snippet: string
}

export interface Claim {
  id: string
  text: string
  /** Papel interno na agregação; a UI ainda não o expõe. */
  role: ClaimRole
  status?: Classification
  evidenceIds?: string[]
}

/** Fonte candidata/selecionada, com o resultado da tentativa de leitura. */
export interface SourceDoc {
  id: string
  title: string
  url: string
  domain: string
  tier: SourceTier
  readStatus: ReadStatus
  accessedAt: string
  snippet?: string
  /** Texto efetivamente lido (somente quando readStatus = 'read'). */
  text?: string
  publishedAt?: string
}

/** Evidência bruta devolvida pela IA (ainda NÃO validada). */
export interface RawEvidence {
  claimId: string
  sourceId: string
  quote: string
  context: string
  stance: Stance
  foundValue?: string
  allegedValue?: string
}

export interface ValidEvidence extends RawEvidence {
  id: string
  tier: SourceTier
  /** Proveniência interna do stance; não exposta ao frontend nesta versão. */
  stanceSource?: StanceSource
}

// ---------- Contrato de resposta (compatível com o front) ----------

export interface ApiSource {
  id: string
  name: string
  title: string
  domain: string
  description: string
  url: string
  readStatus: ReadStatus
  accessedAt: string
  tier: SourceTier
  publishedAt?: string
}

export interface ApiEvidence {
  id: string
  title: string
  quote: string
  context?: string
  claimId: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  date?: string
  foundValue?: string
  allegedValue?: string
  badge: string
  stance: Stance
}

export interface VerificationResult {
  id: string
  requestId: string
  pipelineVersion: typeof PIPELINE_VERSION
  query: string
  classification: Classification
  summary: string
  explanation: string
  claims: Claim[]
  confidence: ConfidenceLevel
  confidenceExplanation: string
  limitations: string[]
  evidences: ApiEvidence[]
  sources: ApiSource[]
  analyzedAt: string
}
