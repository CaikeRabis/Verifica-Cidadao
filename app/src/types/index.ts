/** Cinco classificações previstas no documento-base (seção 7). */
export type Classification =
  | 'confirmada'
  | 'parcialmente-confirmada'
  | 'sem-evidencias'
  | 'contradita'
  | 'analise-humana'

export interface Source {
  id: string
  name: string
  domain: string
  description: string
  url: string
  readStatus?: 'read' | 'snippet-only' | 'unavailable'
  accessedAt?: string
  tier?: 'oficial' | 'jornalismo' | 'outro'
  publishedAt?: string
}

/** Afirmação verificável identificada a partir do texto original. */
export type ClaimStatus =
  | 'confirmada'
  | 'parcialmente-confirmada'
  | 'sem-evidencias'
  | 'contradita'
  | 'analise-humana'
  | 'verificada'

export interface Claim {
  id: string
  text: string
  status?: ClaimStatus
  statusLabel?: string
  evidenceIds?: string[] // IDs das evidências que sustentam ou contradizem esta afirmação
}

/** Grau de robustez das evidências (não é probabilidade matemática). */
export type ConfidenceLevel = 'alta' | 'media' | 'baixa'

export interface Evidence {
  id: string
  title: string
  description?: string
  quote?: string
  sourceName?: string
  sourceId?: string
  sourceUrl?: string
  claimId?: string // Vincula esta evidência à afirmação correspondente
  date?: string
  foundValue?: string
  allegedValue?: string
  context?: string
  badge?: string
}

export interface VerificationResult {
  id: string
  requestId?: string
  pipelineVersion?: string
  query: string
  classification: Classification
  summary: string
  explanation: string
  claims?: Claim[] // Afirmações verificáveis identificadas
  confidence?: ConfidenceLevel // Grau de robustez das evidências
  confidenceExplanation?: string // Explicação do indicador de robustez
  limitations?: string[] // Limitações específicas desta consulta
  evidences?: Evidence[] // Evidências estruturadas
  sources: Source[]
  analyzedSource?: { url: string; finalUrl: string; domain: string; title?: string; publishedDate?: string }
  analyzedAt: string // ISO
}

export interface ClassificationMeta {
  label: string
  short: string
  description: string
}

export interface ModuleInfo {
  id: string
  title: string
  description: string
  active: boolean
  icon: 'search' | 'document' | 'share' | 'book'
}

export interface EducationTopic {
  id: string
  title: string
  description: string
  duration: string
}

export type VerifyStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'empty'
  | 'source-unavailable'
  | 'unsupported-format'
