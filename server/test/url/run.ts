import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { loadConfig } from '../../src/config'
import { OpenAiCompatibleService } from '../../src/services/aiService'
import { createSearchProvider } from '../../src/services/searchService'
import { readAnalyzedPage } from '../../src/services/sourceReader'
import { verify, type PipelineTrace } from '../../src/services/verificationService'
import { canonicalUrlKey, isSameUrlIdentity } from '../../src/lib/urlIdentity'
import type { Classification } from '../../src/types'

interface UrlCase { id: string; url: string; expectedBehavior: 'success' | 'unsupported-or-unreadable'; expectedClassification?: Classification; notes: string }
const root = resolve(import.meta.dirname, '..', '..')
const newTrace = (): PipelineTrace => ({ timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [], evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0, retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [], selfReferenceRejections: [] })

async function main() {
  process.loadEnvFile(resolve(root, '.env'))
  const config = { ...loadConfig(), searchProvider: 'duckduckgo' as const }
  const fixture = JSON.parse(await readFile(resolve(import.meta.dirname, 'url-real.v0.3.json'), 'utf8')) as { cases: UrlCase[] }
  const deps = { ai: new OpenAiCompatibleService(config), search: createSearchProvider(config) }
  const results: unknown[] = []
  for (const item of fixture.cases) {
    const started = performance.now(); const trace = newTrace()
    try {
      const fetchStarted = performance.now(); const page = await readAnalyzedPage(item.url); const initialUrlFetch = Math.round(performance.now() - fetchStarted)
      const result = await verify(item.url, { ...deps, trace }, { claimInput: page.text, analyzedSource: { url: page.url, originalUrl: item.url, finalUrl: page.finalUrl, domain: page.domain, title: page.title, publishedDate: page.publishedDate } })
      const analyzedUrls = [item.url, page.url, page.finalUrl]
      const selfReferenced = result.sources.some((source) => isSameUrlIdentity(source.url, analyzedUrls)) || result.evidences.some((evidence) => isSameUrlIdentity(evidence.sourceUrl, analyzedUrls))
      const searchAttempts = trace.searchAttempts
      const braveFallbackRequests = searchAttempts.filter((attempt) => attempt.provider === 'brave').length
      results.push({ id: item.id, url: item.url, expectedBehavior: item.expectedBehavior, expectedClassification: item.expectedClassification, analyzedSource: { originalUrl: item.url, fetchedUrl: page.url, finalUrl: page.finalUrl, originalKey: canonicalUrlKey(item.url), finalKey: canonicalUrlKey(page.finalUrl) }, title: page.title, domain: page.domain, initialUrlFetch, claims: result.claims.map((claim) => ({ text: claim.text, role: claim.role, status: claim.status })), searches: trace.searchCalls.length, searchAttempts, braveFallbackRequests, verificationSources: result.sources.map((source) => source.url), evidences: result.evidences.map((evidence) => ({ sourceUrl: evidence.sourceUrl, stance: evidence.stance })), selfReferenceRejections: trace.selfReferenceRejections, classification: result.classification, selfReferenced, passed: !selfReferenced && result.classification === item.expectedClassification, latencyMs: Math.round(performance.now() - started), timings: trace.timingsMs })
    } catch (error) {
      results.push({ id: item.id, url: item.url, expectedBehavior: item.expectedBehavior, error: error instanceof Error ? error.message : 'erro desconhecido', searchAttempts: trace.searchAttempts, braveFallbackRequests: trace.searchAttempts.filter((attempt) => attempt.provider === 'brave').length, passed: item.expectedBehavior === 'unsupported-or-unreadable', latencyMs: Math.round(performance.now() - started) })
    }
  }
  const ok = results.filter((item: any) => !item.error); const times = ok.map((item: any) => item.latencyMs).sort((a: number, b: number) => a - b)
  const fallbackCases = results.filter((item: any) => item.braveFallbackRequests > 0)
  const noFallbackCases = ok.filter((item: any) => item.braveFallbackRequests === 0)
  const average = (items: any[]) => items.length ? Math.round(items.reduce((sum, item) => sum + item.latencyMs, 0) / items.length) : 0
  const report = { total: results.length, passed: results.filter((item: any) => item.passed).length, braveFallbackRequests: results.reduce((sum: number, item: any) => sum + (item.braveFallbackRequests ?? 0), 0), averageLatencyMs: times.length ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0, medianLatencyMs: times[Math.floor(times.length / 2)], maxLatencyMs: times.at(-1), latencyWithoutFallbackMs: average(noFallbackCases), latencyWithFallbackMs: average(fallbackCases), results }
  const outputDir = resolve(import.meta.dirname, 'results')
  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}
void main()
