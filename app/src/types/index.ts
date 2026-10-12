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
}

export interface Evidence {
  id: string
  title: string
  description?: string
  quote?: string
  sourceName?: string
  sourceId?: string
  sourceUrl?: string
  date?: string
  foundValue?: string
  allegedValue?: string
  context?: string
  badge?: string
}

export interface VerificationResult {
  id: string
  query: string
  classification: Classification
  summary: string
  explanation: string
  evidences?: Evidence[]
  sources: Source[]
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

export type VerifyStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'
