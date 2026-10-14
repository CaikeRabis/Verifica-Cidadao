import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { loadConfig } from '../../src/config'
import { OpenAiCompatibleService } from '../../src/services/aiService'
import { createSearchProvider } from '../../src/services/searchService'
import { verify, type PipelineTrace } from '../../src/services/verificationService'
import { PIPELINE_VERSION } from '../../src/version'
import type { Classification } from '../../src/types'

const root = resolve(import.meta.dirname, '..', '..')

const cases: { category: string; expectedClassification: Classification; input: string }[] = [
  { category: 'true', expectedClassification: 'confirmada', input: 'Brasília foi inaugurada em 21 de abril de 1960.' },
  { category: 'true', expectedClassification: 'confirmada', input: 'O Senado Federal é composto por 81 senadores.' },
  { category: 'true', expectedClassification: 'confirmada', input: 'A Constituição Federal foi promulgada em 5 de outubro de 1988.' },
  { category: 'false', expectedClassification: 'contradita', input: 'O salário mínimo nacional em 2024 foi de R$ 5.000.' },
  { category: 'false', expectedClassification: 'contradita', input: 'O STF é composto por 15 ministros.' },
  { category: 'false', expectedClassification: 'contradita', input: 'A Câmara dos Deputados possui 600 deputados federais.' },
  { category: 'partial', expectedClassification: 'parcialmente-confirmada', input: 'O Brasil tem 26 estados e 28 capitais estaduais.' },
  { category: 'partial', expectedClassification: 'parcialmente-confirmada', input: 'A Constituição foi promulgada em 1988 e o STF possui 15 ministros.' },
  { category: 'insufficient', expectedClassification: 'sem-evidencias', input: 'Um programa municipal de leitura aumentou em 40% a frequência escolar em 2023.' },
  { category: 'insufficient', expectedClassification: 'sem-evidencias', input: 'Uma cidade brasileira recebeu o maior investimento cultural da história em 2024.' },
  { category: 'human', expectedClassification: 'analise-humana', input: 'Há fraude comprovada em um contrato público sem identificação do órgão ou documento.' },
  // O antigo caso de datas de obra foi removido: sem obra, órgão ou documentos
  // identificáveis, ele media ausência de contexto, não conflito documental.
]

async function main() {
  process.loadEnvFile(resolve(root, '.env'))
  const config = loadConfig()
  if (!config.aiApiKey) throw new Error('AI_API_KEY não configurada para a bateria real.')
  const deps = { ai: new OpenAiCompatibleService(config), search: createSearchProvider(config) }
  const results: unknown[] = []

  for (const testCase of cases) {
    const { category, input, expectedClassification } = testCase
    const started = performance.now()
    const trace: PipelineTrace = {
      timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [],
      evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0,
      retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [],
    }
    try {
      const result = await verify(input, { ...deps, trace })
      results.push({
        category, input, expectedClassification, classification: result.classification,
        passed: result.classification === expectedClassification, confidence: result.confidence,
        claims: result.claims.map((claim) => ({
          id: claim.id, text: claim.text, role: claim.role, status: claim.status,
          coverage: {
            candidates: trace.evidenceCandidates.filter((item) => item.claimId === claim.id).length,
            accepted: trace.acceptedEvidenceTrace.filter((item) => item.claimId === claim.id).length,
            supports: trace.acceptedEvidenceTrace.filter((item) => item.claimId === claim.id && item.stanceFinal === 'supports').length,
            contradicts: trace.acceptedEvidenceTrace.filter((item) => item.claimId === claim.id && item.stanceFinal === 'contradicts').length,
          },
        })),
        sourcesFound: result.sources.length, sourcesRead: result.sources.filter((source) => source.readStatus === 'read').length,
        sources: result.sources.map((source) => ({ title: source.title, domain: source.domain, tier: source.tier, readStatus: source.readStatus })),
        evidencesAccepted: result.evidences.map((evidence) => ({ claimId: evidence.claimId, stance: evidence.stance, source: evidence.sourceName, quote: evidence.quote })),
        evidencesDiscarded: trace.discardedEvidences,
        searchAttempts: trace.searchAttempts,
        braveFallbackRequests: trace.searchAttempts.filter((attempt) => attempt.provider === 'brave').length,
        trace, summary: result.summary, explanation: result.explanation, latencyMs: Math.round(performance.now() - started),
      })
    } catch (error) {
      results.push({ category, input, expectedClassification, passed: false, error: error instanceof Error ? error.message : 'erro desconhecido', searchAttempts: trace.searchAttempts, braveFallbackRequests: trace.searchAttempts.filter((attempt) => attempt.provider === 'brave').length, trace, latencyMs: Math.round(performance.now() - started) })
    }
  }

  const latencies = results.map((item) => (item as { latencyMs: number }).latencyMs).sort((a, b) => a - b)
  const report = {
    generatedAt: new Date().toISOString(), pipelineVersion: PIPELINE_VERSION, total: results.length,
    averageLatencyMs: Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length),
    medianLatencyMs: latencies[Math.floor(latencies.length / 2)], maxLatencyMs: latencies.at(-1),
    passed: results.filter((item) => (item as { passed?: boolean }).passed).length,
    braveFallbackRequests: results.reduce<number>((sum, item) => sum + ((item as { braveFallbackRequests?: number }).braveFallbackRequests ?? 0), 0),
    results,
  }
  const dir = resolve(root, 'test/real/results')
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}

void main()
