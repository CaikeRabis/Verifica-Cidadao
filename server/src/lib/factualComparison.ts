import { extractKeywords } from './queryGeneration'
import type { Stance } from '../types'

export type FactualEntityKind = 'money' | 'percentage' | 'number' | 'year' | 'date'

export interface FactualEntity {
  kind: FactualEntityKind
  raw: string
  value: string
}

export interface FactualComparison {
  stance: Extract<Stance, 'supports' | 'contradicts'>
  kind: FactualEntityKind
}

const MONTHS: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

const CONTEXT_NOISE = new Set(['possui', 'composto', 'composta', 'foi', 'sao', 'esta', 'para', 'sobre', 'como'])

function normalizeNumber(raw: string): string | undefined {
  const clean = raw.replace(/^R\$\s*/i, '').replace(/%$/, '').replace(/\s/g, '')
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:,\d+)?$/.test(clean)) return undefined
  const canonical = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean.replace(/\./g, '')
  const value = Number(canonical)
  return Number.isFinite(value) ? String(value) : undefined
}

function maskRanges(text: string, ranges: [number, number][]): string {
  const chars = [...text]
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i++) chars[i] = ' '
  }
  return chars.join('')
}

/** Extrai valores brasileiros simples sem inferir unidade, data ou contexto ausente. */
export function extractFactualEntities(text: string): FactualEntity[] {
  const entities: FactualEntity[] = []
  const ranges: [number, number][] = []
  const add = (kind: FactualEntityKind, raw: string, value: string | undefined, index: number) => {
    if (!value) return
    entities.push({ kind, raw, value })
    ranges.push([index, index + raw.length])
  }

  const verbalDate = /\b(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})\b/gi
  for (const match of text.matchAll(verbalDate)) {
    const month = MONTHS[match[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()]
    if (month) add('date', match[0], `${match[3]}-${month}-${match[1].padStart(2, '0')}`, match.index ?? 0)
  }
  const numericDate = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g
  for (const match of text.matchAll(numericDate)) {
    const day = Number(match[1])
    const month = Number(match[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      add('date', match[0], `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`, match.index ?? 0)
    }
  }

  const maskedAfterDates = maskRanges(text, ranges)
  const money = /R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d+)?|R\$\s*\d+(?:,\d+)?/gi
  for (const match of maskedAfterDates.matchAll(money)) add('money', match[0], normalizeNumber(match[0]), match.index ?? 0)

  const maskedAfterMoney = maskRanges(maskedAfterDates, ranges.map(([start, end]) => [start, end]))
  const percentage = /\b\d{1,3}(?:\.\d{3})*(?:,\d+)?%|\b\d+(?:,\d+)?%/g
  for (const match of maskedAfterMoney.matchAll(percentage)) add('percentage', match[0], normalizeNumber(match[0]), match.index ?? 0)

  const masked = maskRanges(maskedAfterMoney, ranges.map(([start, end]) => [start, end]))
  const numeric = /\b\d{1,3}(?:\.\d{3})*(?:,\d+)?\b|\b\d+(?:,\d+)?\b/g
  for (const match of masked.matchAll(numeric)) {
    const raw = match[0]
    const kind: FactualEntityKind = /^\d{4}$/.test(raw) && /^(1[5-9]|20)\d{2}$/.test(raw) ? 'year' : 'number'
    add(kind, raw, normalizeNumber(raw), match.index ?? 0)
  }
  return entities
}

function hasClearContext(claim: string, evidence: string): boolean {
  const claimWords = extractKeywords(claim).filter((word) => !CONTEXT_NOISE.has(word) && !/^\d/.test(word))
  const evidenceWords = new Set(extractKeywords(evidence).filter((word) => !CONTEXT_NOISE.has(word) && !/^\d/.test(word)))
  return claimWords.filter((word) => evidenceWords.has(word)).length >= 2
}

/**
 * Só decide quando há uma entidade estruturada do mesmo tipo em cada lado e
 * contexto lexical claro. Fora disso, retorna undefined para preservar a IA.
 */
export function compareFactualClaim(claim: string, evidence: string): FactualComparison | undefined {
  if (!hasClearContext(claim, evidence)) return undefined
  const claimed = extractFactualEntities(claim)
  const found = extractFactualEntities(evidence)
  const kinds: FactualEntityKind[] = ['money', 'percentage', 'date', 'year', 'number']

  const matches: FactualComparison[] = []
  for (const kind of kinds) {
    const left = claimed.filter((entity) => entity.kind === kind)
    const right = found.filter((entity) => entity.kind === kind)
    if (left.length !== 1 || right.length !== 1) continue
    matches.push({ stance: left[0].value === right[0].value ? 'supports' : 'contradicts', kind })
  }
  // Uma divergência objetiva prevalece sobre campos auxiliares coincidentes
  // (ex.: ano igual, mas população ou valor diferente).
  return matches.find((match) => match.stance === 'contradicts') ?? matches[0]
}
