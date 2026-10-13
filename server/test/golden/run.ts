import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { verify } from '../../src/services/verificationService'
import type { AiService } from '../../src/services/aiService'
import type { SearchProvider } from '../../src/services/searchService'
import type { RawEvidence, SearchResult, Stance } from '../../src/types'

type Classification = 'confirmada' | 'parcialmente-confirmada' | 'sem-evidencias' | 'contradita' | 'analise-humana'
type Direction = 'supports' | 'contradicts' | 'none' | 'conflicting'

interface GoldenCase {
  id: string
  category: 'true' | 'false' | 'partial' | 'insufficient' | 'human' | 'compound'
  input: string
  expectedClassification: Classification
  expectedPrimaryClaim: string
  expectedSecondaryClaims?: string[]
  expectedEvidenceDirection?: Direction
  expectedClaimDirections?: Direction[]
  expectedConfidenceRange?: ('alta' | 'media' | 'baixa')[]
  mustGoHuman?: boolean
  shouldHaveOfficialSource?: boolean
  maxExpectedLatencyMs?: number
  scenario?: 'sensitive-claim' | 'conflicting-evidence' | 'no-readable-source'
  notes: string
}

interface GoldenSet {
  version: string
  cases: GoldenCase[]
}

interface CaseReport {
  id: string
  category: GoldenCase['category']
  passed: boolean
  expected: Classification
  obtained: Classification
  stage: 'ok' | 'classificacao' | 'agregacao' | 'infraestrutura'
  latencyMs: number
  detail?: string
}

const root = resolve(import.meta.dirname, '..', '..')
const goldenPath = resolve(import.meta.dirname, 'golden-set.v0.2.json')

function directionsFor(test: GoldenCase, count: number): Direction[] {
  if (test.expectedClaimDirections) return test.expectedClaimDirections
  return Array.from({ length: count }, () => test.expectedEvidenceDirection ?? 'none')
}

function createDeps(test: GoldenCase) {
  const claims = [test.expectedPrimaryClaim, ...(test.expectedSecondaryClaims ?? [])]
  const directions = directionsFor(test, claims.length)
  const candidates: SearchResult[] = test.scenario === 'conflicting-evidence'
    ? [
        { title: 'Fonte oficial A', url: 'https://dados.gov.br/a', domain: 'dados.gov.br', snippet: 'registro institucional' },
        { title: 'Fonte oficial B', url: 'https://planalto.gov.br/b', domain: 'planalto.gov.br', snippet: 'registro institucional' },
      ]
    : [{ title: 'Fonte institucional', url: 'https://dados.gov.br/referencia', domain: 'dados.gov.br', snippet: 'registro institucional' }]

  const search: SearchProvider = { async search() { return candidates } }
  const ai: AiService = {
    async extractClaims() {
      return claims.map((text) => ({ text }))
    },
    async extractEvidence(_claims, sources) {
      const evidence: RawEvidence[] = []
      for (let index = 0; index < claims.length; index++) {
        const direction = directions[index] ?? 'none'
        if (direction === 'none') continue
        if (direction === 'conflicting') {
          for (const [sourceIndex, source] of sources.entries()) {
            evidence.push({
              claimId: `c${index + 1}`,
              sourceId: source.id,
              quote: sourceIndex === 0 ? `Registro institucional: ${claims[index]}` : `Registro institucional divergente: ${claims[index]}`,
              context: 'Fontes institucionais apresentam registros incompatíveis.',
              stance: sourceIndex === 0 ? 'supports' : 'contradicts',
            })
          }
          continue
        }
        const source = sources[0]
        evidence.push({
          claimId: `c${index + 1}`,
          sourceId: source.id,
          quote: `Registro institucional: ${claims[index]}`,
          context: 'Trecho institucional relacionado à afirmação analisada.',
          stance: direction as Stance,
        })
      }
      return evidence
    },
  }
  const fetcher = async (url: string) => {
    if (test.scenario === 'no-readable-source') throw new Error('Fonte indisponível na fixture')
    const alternative = url.endsWith('/b')
      ? `Registro institucional divergente: ${claims[0]}`
      : ''
    return {
      finalUrl: url,
      contentType: 'text/html',
      body: `<title>Referência institucional</title><article>${claims.map((claim) => `Registro institucional: ${claim}.`).join(' ')} ${alternative} ${'Informação pública para verificação. '.repeat(12)}</article>`,
      truncated: false,
    }
  }
  return { ai, search, fetcher, now: () => new Date('2026-10-13T12:00:00.000Z') }
}

function stageFor(test: GoldenCase, obtained: Classification): CaseReport['stage'] {
  if (test.category === 'compound' && test.expectedClassification === 'contradita' && obtained === 'parcialmente-confirmada') {
    return 'agregacao'
  }
  return 'classificacao'
}

async function runCase(test: GoldenCase): Promise<CaseReport> {
  const started = performance.now()
  try {
    const result = await verify(test.input, createDeps(test))
    const latencyMs = Math.round(performance.now() - started)
    const confidenceOk = !test.expectedConfidenceRange || test.expectedConfidenceRange.includes(result.confidence)
    const humanOk = !test.mustGoHuman || result.classification === 'analise-humana'
    const sourceOk = !test.shouldHaveOfficialSource || test.scenario === 'no-readable-source' || result.sources.some((s) => s.tier === 'oficial')
    const latencyOk = !test.maxExpectedLatencyMs || latencyMs <= test.maxExpectedLatencyMs
    const passed = result.classification === test.expectedClassification && confidenceOk && humanOk && sourceOk && latencyOk
    const detail = passed
      ? undefined
      : [
          !confidenceOk && `robustez obtida: ${result.confidence}`,
          !sourceOk && 'fonte oficial ausente',
          !latencyOk && `latência ${latencyMs}ms`,
        ].filter(Boolean).join('; ') || 'classificação divergente'
    return { id: test.id, category: test.category, passed, expected: test.expectedClassification, obtained: result.classification, stage: passed ? 'ok' : stageFor(test, result.classification), latencyMs, detail }
  } catch (error) {
    return {
      id: test.id,
      category: test.category,
      passed: false,
      expected: test.expectedClassification,
      obtained: 'analise-humana',
      stage: 'infraestrutura',
      latencyMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : 'erro desconhecido',
    }
  }
}

async function main() {
  const set = JSON.parse(await readFile(goldenPath, 'utf8')) as GoldenSet
  const reports = await Promise.all(set.cases.map(runCase))
  const passed = reports.filter((report) => report.passed)
  const failed = reports.filter((report) => !report.passed)
  const average = reports.reduce((sum, report) => sum + report.latencyMs, 0) / reports.length
  const summary = {
    goldenSetVersion: set.version,
    total: reports.length,
    passed: passed.length,
    failed: failed.length,
    coherenceRate: Number(((passed.length / reports.length) * 100).toFixed(1)),
    averageLatencyMs: Number(average.toFixed(1)),
    failures: failed,
  }

  console.log(`Golden set ${set.version}: ${summary.passed}/${summary.total} acertos (${summary.coherenceRate}%)`)
  console.log(`Tempo médio: ${summary.averageLatencyMs} ms`)
  if (failed.length) {
    console.log('Falhas:')
    for (const report of failed) console.log(`- ${report.id}: esperado ${report.expected}, obtido ${report.obtained} [${report.stage}]${report.detail ? ` — ${report.detail}` : ''}`)
  }

  if (process.argv.includes('--write')) {
    const resultsDir = resolve(root, 'test/golden/results')
    await mkdir(resultsDir, { recursive: true })
    await writeFile(resolve(resultsDir, 'latest.json'), `${JSON.stringify(summary, null, 2)}\n`)
  }
}

void main()
