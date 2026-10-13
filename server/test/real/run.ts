import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { loadConfig } from '../../src/config'
import { OpenAiCompatibleService } from '../../src/services/aiService'
import { createSearchProvider } from '../../src/services/searchService'
import { verify } from '../../src/services/verificationService'
import { PIPELINE_VERSION } from '../../src/version'

const root = resolve(import.meta.dirname, '..', '..')

const cases = [
  ['true', 'Brasília foi inaugurada em 21 de abril de 1960.'],
  ['true', 'O Senado Federal é composto por 81 senadores.'],
  ['true', 'A Constituição Federal foi promulgada em 5 de outubro de 1988.'],
  ['false', 'O salário mínimo nacional em 2024 foi de R$ 5.000.'],
  ['false', 'O STF é composto por 15 ministros.'],
  ['false', 'A Câmara dos Deputados possui 600 deputados federais.'],
  ['partial', 'O Brasil tem 26 estados e 28 capitais estaduais.'],
  ['partial', 'A Constituição foi promulgada em 1988 e o STF possui 15 ministros.'],
  ['insufficient', 'Um programa municipal de leitura aumentou em 40% a frequência escolar em 2023.'],
  ['insufficient', 'Uma cidade brasileira recebeu o maior investimento cultural da história em 2024.'],
  ['human', 'Há fraude comprovada em um contrato público sem identificação do órgão ou documento.'],
  ['human', 'Duas fontes oficiais apresentam datas diferentes para a conclusão de uma obra pública.'],
] as const

async function main() {
  process.loadEnvFile(resolve(root, '.env'))
  const config = loadConfig()
  if (!config.aiApiKey) throw new Error('AI_API_KEY não configurada para a bateria real.')
  const deps = { ai: new OpenAiCompatibleService(config), search: createSearchProvider(config) }
  const results: unknown[] = []

  for (const [category, input] of cases) {
    const started = performance.now()
    try {
      const result = await verify(input, deps)
      results.push({
        category, input, classification: result.classification, confidence: result.confidence,
        primaryClaim: result.claims.find((claim) => claim.role === 'primary')?.text,
        sourcesFound: result.sources.length, sourcesRead: result.sources.filter((source) => source.readStatus === 'read').length,
        sources: result.sources.map((source) => ({ title: source.title, domain: source.domain, readStatus: source.readStatus })),
        evidences: result.evidences.map((evidence) => ({ stance: evidence.stance, source: evidence.sourceName, quote: evidence.quote })),
        summary: result.summary, explanation: result.explanation, latencyMs: Math.round(performance.now() - started),
      })
    } catch (error) {
      results.push({ category, input, error: error instanceof Error ? error.message : 'erro desconhecido', latencyMs: Math.round(performance.now() - started) })
    }
  }

  const latencies = results.map((item) => (item as { latencyMs: number }).latencyMs).sort((a, b) => a - b)
  const report = {
    generatedAt: new Date().toISOString(), pipelineVersion: PIPELINE_VERSION, total: results.length,
    averageLatencyMs: Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length),
    medianLatencyMs: latencies[Math.floor(latencies.length / 2)], maxLatencyMs: latencies.at(-1), results,
  }
  const dir = resolve(root, 'test/real/results')
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}

void main()
