import { randomUUID } from 'node:crypto'
import { AiInvalidResponseError, AiUnavailableError, SearchUnavailableError } from '../errors'
import { guardText } from '../lib/languageSafety'
import { extractKeywords, generateSearchQueries } from '../lib/queryGeneration'
import { selectSources } from '../lib/sourceRanking'
import type {
  ApiEvidence,
  ApiSource,
  Claim,
  ClaimRole,
  Classification,
  ConfidenceLevel,
  SearchResult,
  RawEvidence,
  SourceDoc,
  SourceTier,
  Stance,
  ValidEvidence,
  VerificationResult,
  AnalyzedSource,
} from '../types'
import type { AiService } from './aiService'
import { classify } from './classification'
import { validateEvidences, type EvidenceRejectionReason } from './evidenceValidation'
import type { SearchAttempt, SearchProvider } from './searchService'
import { defaultFetcher, readSources, type PageFetcher } from './sourceReader'
import { PIPELINE_VERSION } from '../version'
import { composeNarrative } from '../lib/resultNarrative'
import { performance } from 'node:perf_hooks'
import { selectRelevantWindows } from '../lib/contentWindowing'
import { recoverDeterministicEvidence, type DeterministicRecoveryTrace } from './deterministicEvidenceRecovery'
import { canonicalUrlKey, isSameUrlIdentity } from '../lib/urlIdentity'
import { VerificationBudget, VERIFICATION_TIME_BUDGET_MS } from '../lib/verificationBudget'

export interface PipelineTrace {
  timingsMs: Record<string, number>
  queries: Record<string, string[]>
  searchResults: Record<string, SearchResult[]>
  searchCalls: { claimId: string; query: string; durationMs: number; resultCount: number; providers: string[] }[]
  searchAttempts: ({ claimId: string; query: string } & SearchAttempt)[]
  selectedSources: { title: string; url: string; domain: string; tier: SourceTier }[]
  fetches: { sourceId: string; url: string; domain: string; durationMs: number; readStatus: string; bytes?: number; failureReason?: string }[]
  aiCalls: { purpose: 'claim-extraction' | 'evidence-extraction' | 'targeted-evidence-extraction' | 'second-round-evidence-extraction'; durationMs: number; aiAttempt: 1 | 2; retryTriggered: boolean; retryReason?: 'ZERO_VALID_CLAIMS' | 'PRIMARY_WITHOUT_VALID_EVIDENCE' }[]
  evidenceCandidates: { evidenceCandidateId: string; claimId: string; sourceId: string; windowId?: string; quote: string; context: string; stanceFromAI: Stance; structuredEntities: unknown[] }[]
  rejectedEvidences: { claimId: string; sourceId: string; quote: string; reason: EvidenceRejectionReason; relevanceChecks?: Record<string, boolean | number> }[]
  acceptedEvidenceTrace: { claimId: string; sourceId: string; quote: string; stanceFromAI: Stance; stanceFinal: Stance; stanceSource?: string; evidenceSource?: string; relevanceChecks: Record<string, boolean | number> }[]
  windows: { sourceId: string; windowId: string; startOffset: number; endOffset: number; score: number; matchedTerms: string[]; structuredMatches: string[]; text: string }[]
  acceptedEvidences: number
  discardedEvidences: number
  retries: {
    extraAiCalls: number
    claims?: { aiAttempt: 1 | 2; retryTriggered: boolean; retryReason?: 'ZERO_VALID_CLAIMS' }
    evidence: { claimId: string; aiAttempt: 1 | 2; retryTriggered: boolean; retryReason?: 'PRIMARY_WITHOUT_VALID_EVIDENCE'; reusedSources: string[]; reusedWindowIds: string[]; candidatesAttempt1: number; candidatesAttempt2?: number; acceptedAttempt1: number; acceptedAttempt2?: number }[]
  }
  deterministicRecoveries: DeterministicRecoveryTrace[]
  selfReferenceRejections: { stage: 'search' | 'source' | 'evidence'; candidateUrl: string; normalizedCandidateKey: string; analyzedOriginalKey: string; analyzedFinalKey: string; rejected: true; reason: 'ANALYZED_SOURCE_SELF_REFERENCE' }[]
  secondaryRecovery: {
    claimId: string
    material: boolean
    coverageBeforeRecovery: boolean
    targetedSearchTriggered: boolean
    targetedQuery?: string
    searchProvider: string[]
    fallbackUsed: boolean
    selectedSources: string[]
    readSources: string[]
    evidences: { sourceId: string; stance: Stance }[]
    coverageAfterRecovery: boolean
    finalStatus?: Classification
    latencyAddedMs: number
  }[]
  secondaryTargetedSearches: number
  additionalSearchRequests: number
  additionalBraveFallbackRequests: number
  secondaryRecoveryLatencyMs: number
  budget: { budgetMs: number; elapsedMs: number; remainingMs: number; budgetExhausted: boolean; skippedOperations: { stage: string; reason: 'TIME_BUDGET_EXHAUSTED' }[] }
}

function evidenceObserver(trace?: PipelineTrace) {
  if (!trace) return undefined
  let index = trace.evidenceCandidates.length
  return {
    candidate: (item: any) => trace.evidenceCandidates.push({ evidenceCandidateId: `ec${++index}`, ...item }),
    rejected: (item: any) => trace.rejectedEvidences.push(item),
    accepted: (item: any) => trace.acceptedEvidenceTrace.push({ claimId: item.claimId, sourceId: item.sourceId, quote: item.quote, stanceFromAI: item.stanceFromAI, stanceFinal: item.stance, stanceSource: item.stanceSource, evidenceSource: item.evidenceSource, relevanceChecks: item.relevanceChecks }),
  }
}

export interface VerificationDeps {
  ai: AiService
  search: SearchProvider
  fetcher?: PageFetcher
  now?: () => Date
  maxSources?: number
  verificationTimeBudgetMs?: number
  /** Diagnóstico interno, usado pela bateria real; não faz parte da resposta da API. */
  trace?: PipelineTrace
}

export interface VerificationOptions {
  /** Texto limpo da página analisada; a URL continua sendo a query exposta. */
  claimInput?: string
  analyzedSource?: AnalyzedSource
  budget?: VerificationBudget
}

/**
 * Normaliza a estrutura semântica devolvida pela IA.
 * Preserva compatibilidade: caso roles estejam ausentes/inválidas, a primeira
 * claim válida vira principal e as demais, secundárias. Há sempre no máximo uma
 * principal no pipeline.
 */
export function normalizeClaims(drafts: { text: string; role?: ClaimRole; material?: boolean }[]): Claim[] {
  let primaryAssigned = false
  return drafts.slice(0, 3).map((draft, index) => {
    const requestedPrimary = draft.role === 'primary'
    const role: ClaimRole = requestedPrimary && !primaryAssigned
      ? 'primary'
      : !primaryAssigned && index === 0
        ? 'primary'
        : 'secondary'
    if (role === 'primary') primaryAssigned = true
    return { id: `c${index + 1}`, text: draft.text, role, material: role === 'secondary' ? draft.material !== false : undefined }
  })
}

const BADGE: Record<Stance, string> = {
  supports: 'Sustenta a afirmação',
  contradicts: 'Diverge da afirmação',
  unclear: 'Trecho ambíguo',
  insufficient: 'Insuficiente',
}

const TIER_TEXT: Record<SourceTier, string> = {
  oficial: 'Fonte oficial ou governamental',
  jornalismo: 'Veículo de imprensa reconhecido',
  outro: 'Outro tipo de fonte (menor prioridade)',
}

const brDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : undefined)

function toApiSource(s: SourceDoc): ApiSource {
  return {
    id: s.id,
    name: s.title,
    title: s.title,
    domain: s.domain,
    description: TIER_TEXT[s.tier],
    url: s.url,
    readStatus: s.readStatus,
    accessedAt: s.accessedAt,
    tier: s.tier,
    publishedAt: s.publishedAt,
  }
}

interface BuildArgs {
  requestId: string
  input: string
  now: Date
  claims: Claim[]
  sources: SourceDoc[]
  evidences?: ApiEvidence[]
  validEvidences?: ValidEvidence[]
  classification: Classification
  confidence: ConfidenceLevel
  confidenceExplanation: string
  humanReason?: string
  limitations: string[]
  analyzedSource?: AnalyzedSource
}

function buildResult(a: BuildArgs): VerificationResult {
  const narrative = composeNarrative({
    classification: a.classification, claims: a.claims, sources: a.sources,
    evidences: a.validEvidences ?? [], humanReason: a.humanReason,
  })
  const summary = guardText(narrative.summary)
  const explanation = guardText(narrative.explanation)
  return {
    id: `vc-${randomUUID()}`,
    requestId: a.requestId,
    pipelineVersion: PIPELINE_VERSION,
    query: a.input,
    classification: a.classification,
    summary: summary.text,
    explanation: explanation.text,
    claims: a.claims,
    confidence: a.confidence,
    confidenceExplanation: a.confidenceExplanation,
    limitations: a.limitations,
    evidences: a.evidences ?? [],
    sources: a.sources.map(toApiSource),
    analyzedSource: a.analyzedSource,
    analyzedAt: a.now.toISOString(),
  }
}

const LOW = 'Pouca base documental para uma conclusão: o resultado depende de leitura humana das fontes.'

/** Pipeline v0.2: claims → busca → seleção → leitura → evidências → classificação → segurança → resposta. */
export async function verify(input: string, deps: VerificationDeps, options: VerificationOptions = {}): Promise<VerificationResult> {
  const pipelineStarted = performance.now()
  const budget = options.budget ?? new VerificationBudget(deps.verificationTimeBudgetMs ?? VERIFICATION_TIME_BUDGET_MS)
  if (deps.trace) deps.trace.budget.budgetMs = budget.budgetMs
  const now = (deps.now ?? (() => new Date()))()
  const requestId = randomUUID().slice(0, 8)
  const fetcher = deps.fetcher ?? defaultFetcher
  const base = { requestId, input, now, analyzedSource: options.analyzedSource }
  const limitations: string[] = []
  const skipForBudget = (stage: string) => {
    deps.trace?.budget.skippedOperations.push({ stage, reason: 'TIME_BUDGET_EXHAUSTED' })
    if (!limitations.some((item) => item.includes('limite de tempo'))) limitations.push('A verificação atingiu o limite de tempo antes de consultar todas as fontes planejadas.')
  }
  const analyzedUrls = options.analyzedSource
    ? [options.analyzedSource.originalUrl ?? options.analyzedSource.url, options.analyzedSource.finalUrl]
    : []
  const analyzedOriginalKey = analyzedUrls[0] ? canonicalUrlKey(analyzedUrls[0]) : ''
  const analyzedFinalKey = analyzedUrls[1] ? canonicalUrlKey(analyzedUrls[1]) : ''
  const isSelfReference = (url: string) => analyzedUrls.length > 0 && isSameUrlIdentity(url, analyzedUrls)
  const recordSelfReference = (stage: 'search' | 'source' | 'evidence', candidateUrl: string) => {
    deps.trace?.selfReferenceRejections.push({
      stage, candidateUrl, normalizedCandidateKey: canonicalUrlKey(candidateUrl), analyzedOriginalKey, analyzedFinalKey,
      rejected: true, reason: 'ANALYZED_SOURCE_SELF_REFERENCE',
    })
  }
  const search = async (claimId: string, query: string, limit: number) => {
    if (!budget.canStartOperation(8000)) { skipForBudget('search'); return [] }
    try {
      const results = await deps.search.search(query, limit, { timeoutMs: Math.max(1, budget.remainingMs() - 500), canFallback: () => budget.canStartOperation(8000) })
      const attempts = deps.search.takeAttempts?.() ?? [{
        provider: (results[0]?.provider === 'brave' ? 'brave' : 'duckduckgo') as 'brave' | 'duckduckgo',
        success: true,
        resultCount: results.length,
        fallbackTriggered: false,
      }]
      deps.trace?.searchAttempts.push(...attempts.map((attempt) => ({ claimId, query, ...attempt })))
      if (attempts.some((attempt) => attempt.fallbackSkippedReason === 'TIME_BUDGET_EXHAUSTED')) skipForBudget('brave-fallback')
      return results
    } catch (error) {
      const attempts = deps.search.takeAttempts?.() ?? [{
        provider: 'duckduckgo' as const,
        success: false,
        failureReason: 'SEARCH_PROVIDER_UNAVAILABLE' as const,
        resultCount: 0,
        fallbackTriggered: false,
      }]
      deps.trace?.searchAttempts.push(...attempts.map((attempt) => ({ claimId, query, ...attempt })))
      if (attempts.some((attempt) => attempt.fallbackSkippedReason === 'TIME_BUDGET_EXHAUSTED')) skipForBudget('brave-fallback')
      throw error
    }
  }

  // 1. Claims (falha da IA aqui interrompe: não há o que verificar)
  const claimsStarted = performance.now()
  const claimInput = options.claimInput ?? input
  let drafts = await deps.ai.extractClaims(claimInput)
  deps.trace && (deps.trace.timingsMs.claimExtraction = Math.round(performance.now() - claimsStarted))
  deps.trace?.aiCalls.push({ purpose: 'claim-extraction', durationMs: deps.trace.timingsMs.claimExtraction, aiAttempt: 1, retryTriggered: false })
  let claims = normalizeClaims(drafts)
  if (claims.length === 0) {
    const retryStarted = performance.now()
    drafts = await deps.ai.extractClaims(claimInput, { retry: true })
    const retryDuration = Math.round(performance.now() - retryStarted)
    claims = normalizeClaims(drafts)
    if (deps.trace) {
      deps.trace.aiCalls.push({ purpose: 'claim-extraction', durationMs: retryDuration, aiAttempt: 2, retryTriggered: true, retryReason: 'ZERO_VALID_CLAIMS' })
      deps.trace.retries.extraAiCalls++
      deps.trace.retries.claims = { aiAttempt: 2, retryTriggered: true, retryReason: 'ZERO_VALID_CLAIMS' }
      deps.trace.timingsMs.claimExtraction += retryDuration
    }
  }
  if (claims.length === 0) {
    const out = classify({ claims, evidences: [] })
    return buildResult({ ...base, claims, sources: [], ...out, limitations: ['Não foi identificada nenhuma afirmação factual verificável no texto.'] })
  }

  // 2. Busca (gera até 3 consultas complementares por afirmação)
  const searchStarted = performance.now()
  const perClaimSearches: { results: SearchResult[]; claimText: string }[] = []
  for (const c of claims) {
    const queries = generateSearchQueries(c.text)
    if (deps.trace) deps.trace.queries[c.id] = queries
    const merged: SearchResult[] = []
    const seenUrls = new Set<string>()
    for (const q of queries) {
      try {
        const queryStarted = performance.now()
        const results = await search(c.id, q, 6)
        deps.trace?.searchCalls.push({ claimId: c.id, query: q, durationMs: Math.round(performance.now() - queryStarted), resultCount: results.length, providers: [...new Set(results.map((item) => item.provider ?? 'unknown'))] })
        for (const item of results) {
          // Conteúdo analisado nunca é fonte confirmatória de si mesmo.
          if (isSelfReference(item.url)) { recordSelfReference('search', item.url); continue }
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url)
            merged.push(item)
          }
        }
      } catch {
        // falhas pontuais continuam para a próxima consulta complementar
      }
    }
    if (deps.trace) deps.trace.searchResults[c.id] = merged
    perClaimSearches.push({ results: merged, claimText: c.text })
  }
  deps.trace && (deps.trace.timingsMs.search = Math.round(performance.now() - searchStarted))

  const allSearchesFailed = perClaimSearches.every((p) => p.results.length === 0)
  if (allSearchesFailed) {
    if (deps.trace?.budget.skippedOperations.length) {
      const out = classify({ claims, evidences: [], noSourcesRead: true })
      deps.trace.budget.elapsedMs = budget.elapsedMs()
      deps.trace.budget.remainingMs = budget.remainingMs()
      deps.trace.budget.budgetExhausted = true
      return buildResult({ ...base, claims: withStatus(claims, out.claimStatus, []), sources: [], ...out, limitations })
    }
    throw new SearchUnavailableError('busca indisponível')
  }

  // 3. Seleção refinada (garante fontes oficiais e diversidade de domínios)
  const selected = selectSources(perClaimSearches, deps.maxSources ?? 5, 3)
  if (deps.trace) deps.trace.selectedSources.push(...selected.map((s) => ({ title: s.title, url: s.url, domain: s.domain, tier: s.tier })))
  if (selected.length === 0) {
    const out = classify({ claims, evidences: [], noSourcesRead: true })
    return buildResult({ ...base, claims: withStatus(claims, out.claimStatus, []), sources: [], ...out, limitations: [...limitations, 'A busca não retornou páginas relacionadas à afirmação.'] })
  }

  // 4. Leitura real das páginas
  const readingStarted = performance.now()
  const fetchedSources = await readSources(selected, fetcher, () => now, 0, (event) => deps.trace?.fetches.push(event))
  const allFetchedSources = [...fetchedSources]
  const selfSourceIds = new Set(fetchedSources.filter((source) => isSelfReference(source.url)).map((source) => source.id))
  for (const source of fetchedSources.filter((item) => selfSourceIds.has(item.id))) recordSelfReference('source', source.url)
  const sources = fetchedSources.filter((source) => !selfSourceIds.has(source.id))
  deps.trace && (deps.trace.timingsMs.readSources = Math.round(performance.now() - readingStarted))
  const read = sources.filter((s) => s.readStatus === 'read')
  if (deps.trace) deps.trace.windows.push(...read.flatMap((source) => selectRelevantWindows(source.id, source.text ?? '', claims, 6000).map((window) => ({ sourceId: source.id, ...window }))))
  const unread = sources.length - read.length
  if (unread > 0) {
    limitations.push(
      `${unread} página(s) encontrada(s) não puderam ser lidas (indisponíveis, protegidas ou em formato não suportado). Elas aparecem como "não lidas" e não foram usadas como evidência.`,
    )
  }
  if (sources.some((s) => s.readStatus === 'snippet-only')) {
    limitations.push('Para as páginas não lidas havia apenas o resumo exibido pelo buscador, que não é tratado como evidência.')
  }
  if (read.length === 0) {
    const out = classify({ claims, evidences: [], noSourcesRead: true })
    return buildResult({ ...base, claims: withStatus(claims, out.claimStatus, []), sources, ...out, limitations })
  }

  // 5. Evidências (IA) + validação programática obrigatória
  let validEv: ValidEvidence[] = []
  let discarded = 0
  const evidenceStarted = performance.now()
  try {
    const extractionStarted = performance.now()
    const raw = await deps.ai.extractEvidence(claims, read)
    deps.trace?.aiCalls.push({ purpose: 'evidence-extraction', durationMs: Math.round(performance.now() - extractionStarted), aiAttempt: 1, retryTriggered: false })
    const validate = (evidence: RawEvidence[], scopedClaims: Claim[]) => {
      const external = evidence.filter((item) => {
        const source = allFetchedSources.find((candidate) => candidate.id === item.sourceId)
        if (!source || !selfSourceIds.has(source.id)) return true
        recordSelfReference('evidence', source.url)
        deps.trace?.rejectedEvidences.push({ claimId: item.claimId, sourceId: item.sourceId, quote: item.quote, reason: 'ANALYZED_SOURCE_SELF_REFERENCE' })
        return false
      })
      return validateEvidences(external, scopedClaims, sources, evidenceObserver(deps.trace))
    }
    const v = validate(raw, claims)
    validEv = v.valid
    discarded = v.discarded

    // Retry estritamente controlado: somente a primary sem cobertura e apenas
    // com fontes/janelas já lidas. Não aciona busca, ranking ou fetch.
    const retryablePrimary = claims.filter((claim) => {
      if (claim.role !== 'primary' || validEv.some((evidence) => evidence.claimId === claim.id)) return false
      return read.some((source) => selectRelevantWindows(source.id, source.text ?? '', [claim], 6000).some((window) => window.score > 0))
    })
    if (retryablePrimary.length > 0) {
      const candidatesAttempt1 = new Map(retryablePrimary.map((claim) => [claim.id, raw.filter((item) => item.claimId === claim.id).length]))
      const acceptedAttempt1 = new Map(retryablePrimary.map((claim) => [claim.id, validEv.filter((item) => item.claimId === claim.id).length]))
      const focusedStarted = performance.now()
      const focusedRaw = await deps.ai.extractEvidence(retryablePrimary, read, { retry: true })
      deps.trace?.aiCalls.push({ purpose: 'targeted-evidence-extraction', durationMs: Math.round(performance.now() - focusedStarted), aiAttempt: 2, retryTriggered: true, retryReason: 'PRIMARY_WITHOUT_VALID_EVIDENCE' })
      const focused = validate(focusedRaw, retryablePrimary)
      discarded += focused.discarded
      validEv = [...validEv, ...focused.valid].map((evidence, index) => ({ ...evidence, id: `e${index + 1}` }))
      if (deps.trace) {
        deps.trace.retries.extraAiCalls++
        for (const claim of retryablePrimary) {
          const windows = read.flatMap((source) => selectRelevantWindows(source.id, source.text ?? '', [claim], 6000)).filter((window) => window.score > 0)
          deps.trace.retries.evidence.push({
            claimId: claim.id,
            aiAttempt: 2,
            retryTriggered: true,
            retryReason: 'PRIMARY_WITHOUT_VALID_EVIDENCE',
            reusedSources: [...new Set(windows.map((window) => window.windowId.replace(/-w\d+$/, '')))],
            reusedWindowIds: windows.map((window) => window.windowId),
            candidatesAttempt1: candidatesAttempt1.get(claim.id) ?? 0,
            candidatesAttempt2: focusedRaw.filter((item) => item.claimId === claim.id).length,
            acceptedAttempt1: acceptedAttempt1.get(claim.id) ?? 0,
            acceptedAttempt2: focused.valid.filter((item) => item.claimId === claim.id).length,
          })
        }
      }
    }

    // Último recurso local: só depois das duas tentativas da IA e somente para
    // a primary ainda descoberta. A recuperação usa um trecho literal de uma
    // janela já lida; não aciona rede, busca nem uma terceira chamada de IA.
    const uncoveredPrimary = claims.filter((claim) => claim.role === 'primary' && !validEv.some((evidence) => evidence.claimId === claim.id))
    for (const claim of uncoveredPrimary) {
      const recovered = recoverDeterministicEvidence(claim, read)
      deps.trace?.deterministicRecoveries.push(recovered.trace)
      if (!recovered.evidence) continue
      const recoveredValidation = validate([recovered.evidence], [claim])
      discarded += recoveredValidation.discarded
      if (recoveredValidation.valid.length > 0) {
        validEv = [...validEv, ...recoveredValidation.valid].map((evidence, index) => ({ ...evidence, id: `e${index + 1}` }))
      }
    }

    // 5b. Cobertura externa dirigida: no modo URL, uma secondary material que
    // permaneceu descoberta recebe no máximo uma busca própria. A consulta é
    // derivada exclusivamente da secondary, sem reutilizar contexto da primary.
    if (options.analyzedSource) {
      const secondaryEntries = new Map<string, PipelineTrace['secondaryRecovery'][number]>()
      for (const claim of claims.filter((item) => item.role === 'secondary')) {
        const entry: PipelineTrace['secondaryRecovery'][number] = {
          claimId: claim.id,
          material: claim.material !== false,
          coverageBeforeRecovery: validEv.some((evidence) => evidence.claimId === claim.id),
          targetedSearchTriggered: false,
          searchProvider: [] as string[],
          fallbackUsed: false,
          selectedSources: [] as string[],
          readSources: [] as string[],
          evidences: [] as { sourceId: string; stance: Stance }[],
          coverageAfterRecovery: validEv.some((evidence) => evidence.claimId === claim.id),
          latencyAddedMs: 0,
        }
        secondaryEntries.set(claim.id, entry)
        deps.trace?.secondaryRecovery.push(entry)
      }
      const uncoveredSecondary = claims.filter((claim) =>
        claim.role === 'secondary' && claim.material !== false && !validEv.some((evidence) => evidence.claimId === claim.id) && budget.canStartOperation(8000),
      )
      for (const claim of claims.filter((item) => item.role === 'secondary' && item.material !== false && !validEv.some((evidence) => evidence.claimId === item.id) && !budget.canStartOperation(8000))) skipForBudget(`secondary-recovery:${claim.id}`)
      for (const claim of uncoveredSecondary) {
        const recoveryStarted = performance.now()
        const targetedQuery = `${extractKeywords(claim.text).slice(0, 7).join(' ')} dados oficiais`.trim().slice(0, 150)
        const entry = secondaryEntries.get(claim.id)!
        entry.targetedSearchTriggered = true
        entry.targetedQuery = targetedQuery
        if (deps.trace) deps.trace.secondaryTargetedSearches++
        try {
          const attemptsBefore = deps.trace?.searchAttempts.length ?? 0
          const queryStarted = performance.now()
          const results = await search(claim.id, targetedQuery, 6)
          const attempts = deps.trace?.searchAttempts.slice(attemptsBefore) ?? []
          entry.searchProvider = [...new Set(attempts.map((attempt) => attempt.provider))]
          entry.fallbackUsed = attempts.some((attempt) => attempt.fallbackTriggered)
          if (deps.trace) {
            deps.trace.additionalSearchRequests += attempts.length
            deps.trace.additionalBraveFallbackRequests += attempts.filter((attempt) => attempt.provider === 'brave').length
            deps.trace.searchCalls.push({ claimId: claim.id, query: targetedQuery, durationMs: Math.round(performance.now() - queryStarted), resultCount: results.length, providers: [...new Set(results.map((item) => item.provider ?? 'unknown'))] })
          }
          const knownUrls = new Set(allFetchedSources.map((source) => source.url))
          const externalResults = results.filter((item) => {
            if (isSelfReference(item.url)) { recordSelfReference('search', item.url); return false }
            return !knownUrls.has(item.url)
          })
          const candidates = selectSources([{ results: externalResults, claimText: claim.text }], 3, 3)
          entry.selectedSources = candidates.map((source) => source.url)
          deps.trace?.selectedSources.push(...candidates.map((source) => ({ title: source.title, url: source.url, domain: source.domain, tier: source.tier })))
          if (candidates.length > 0) {
            const recoveredSources = await readSources(candidates, fetcher, () => now, allFetchedSources.length, (event) => deps.trace?.fetches.push(event))
            allFetchedSources.push(...recoveredSources)
            const externalSources = recoveredSources.filter((source) => {
              if (!isSelfReference(source.url)) return true
              selfSourceIds.add(source.id)
              recordSelfReference('source', source.url)
              return false
            })
            sources.push(...externalSources)
            const recoveredRead = externalSources.filter((source) => source.readStatus === 'read')
            entry.readSources = recoveredRead.map((source) => source.url)
            if (deps.trace) deps.trace.windows.push(...recoveredRead.flatMap((source) => selectRelevantWindows(source.id, source.text ?? '', [claim], 6000).map((window) => ({ sourceId: source.id, ...window }))))
            if (recoveredRead.length > 0) {
              const extractionStarted = performance.now()
              const rawRecovery = await deps.ai.extractEvidence([claim], recoveredRead)
              deps.trace?.aiCalls.push({ purpose: 'second-round-evidence-extraction', durationMs: Math.round(performance.now() - extractionStarted), aiAttempt: 1, retryTriggered: false })
              const recoveredValidation = validate(rawRecovery, [claim])
              discarded += recoveredValidation.discarded
              entry.evidences = recoveredValidation.valid.map((evidence) => ({ sourceId: evidence.sourceId, stance: evidence.stance }))
              if (recoveredValidation.valid.length > 0) {
                validEv = [...validEv, ...recoveredValidation.valid].map((evidence, index) => ({ ...evidence, id: `e${index + 1}` }))
              }
            }
          }
        } catch {
          // A recuperação de uma secondary é opcional: falhas não interrompem a verificação principal.
        } finally {
          entry.coverageAfterRecovery = validEv.some((evidence) => evidence.claimId === claim.id)
          entry.latencyAddedMs = Math.round(performance.now() - recoveryStarted)
          if (deps.trace) deps.trace.secondaryRecoveryLatencyMs += entry.latencyAddedMs
        }
      }
    }

    // Segunda rodada legada do modo texto. No modo URL, a recuperação acima já
    // limita a uma rodada por secondary material e evita reconsultas ocultas.
    if (!options.analyzedSource && validEv.length === 0 && read.length > 0) {
      const readUrls = new Set(sources.map((s) => s.url))
      const retryMerged: SearchResult[] = []
      for (const c of claims) {
        const kw = extractKeywords(c.text).slice(0, 5).join(' ')
        try {
          const res = await search(c.id, `${kw} dados oficiais`, 6)
          for (const item of res) {
            if (isSelfReference(item.url)) { recordSelfReference('search', item.url); continue }
            if (!readUrls.has(item.url) && !retryMerged.some((m) => m.url === item.url)) {
              retryMerged.push(item)
            }
          }
        } catch {}
      }
      if (retryMerged.length > 0) {
        const round2Candidates = selectSources([{ results: retryMerged }], 3, 3)
        if (deps.trace) deps.trace.selectedSources.push(...round2Candidates.map((s) => ({ title: s.title, url: s.url, domain: s.domain, tier: s.tier })))
        if (round2Candidates.length > 0) {
          const round2Sources = await readSources(round2Candidates, fetcher, () => now, sources.length, (event) => deps.trace?.fetches.push(event))
          const externalRound2Sources = round2Sources.filter((source) => {
            if (!isSelfReference(source.url)) return true
            recordSelfReference('source', source.url)
            return false
          })
          const round2Read = externalRound2Sources.filter((s) => s.readStatus === 'read')
          if (round2Read.length > 0) {
            const round2Started = performance.now()
            const raw2 = await deps.ai.extractEvidence(claims, round2Read)
            deps.trace?.aiCalls.push({ purpose: 'second-round-evidence-extraction', durationMs: Math.round(performance.now() - round2Started), aiAttempt: 1, retryTriggered: false })
            const externalRaw2 = raw2.filter((item) => {
              const source = round2Sources.find((candidate) => candidate.id === item.sourceId)
              if (!source || !isSelfReference(source.url)) return true
              recordSelfReference('evidence', source.url)
              deps.trace?.rejectedEvidences.push({ claimId: item.claimId, sourceId: item.sourceId, quote: item.quote, reason: 'ANALYZED_SOURCE_SELF_REFERENCE' })
              return false
            })
            const v2 = validateEvidences(externalRaw2, claims, [...sources, ...externalRound2Sources], evidenceObserver(deps.trace))
            if (v2.valid.length > 0) {
              validEv = v2.valid
              sources.push(...externalRound2Sources)
              limitations.push('Foi necessária uma segunda rodada de busca com termos complementares para localizar evidências suficientes.')
            }
          }
        }
      }
    }
  } catch (e) {
    if (!(e instanceof AiUnavailableError || e instanceof AiInvalidResponseError)) throw e
    return buildResult({
      ...base,
      claims,
      sources,
      classification: 'analise-humana',
      confidence: 'baixa',
      confidenceExplanation: LOW,
      humanReason: 'A etapa de análise automática dos trechos ficou indisponível ou devolveu uma resposta inválida.',
      limitations: [...limitations, 'As páginas foram lidas, mas a análise automática dos trechos falhou; nenhuma conclusão foi tirada.'],
    })
  }
  if (discarded > 0) {
    limitations.push('Alguns trechos sugeridos pela IA foram descartados por não constarem literalmente nas páginas lidas.')
  }
  if (deps.trace) {
    deps.trace.timingsMs.evidenceExtractionAndValidation = Math.round(performance.now() - evidenceStarted)
    deps.trace.acceptedEvidences = validEv.length
    deps.trace.discardedEvidences = discarded
  }

  // 6. Classificação por regras + robustez
  const classificationStarted = performance.now()
  const out = classify({ claims, evidences: validEv, sources })
  for (const recovery of deps.trace?.secondaryRecovery ?? []) recovery.finalStatus = out.claimStatus[recovery.claimId]
  deps.trace && (deps.trace.timingsMs.classification = Math.round(performance.now() - classificationStarted))

  // 7. Limitações de qualidade
  const allRead = sources.filter((s) => s.readStatus === 'read')
  if (!allRead.some((s) => s.tier === 'oficial')) limitations.push('Nenhuma fonte oficial foi localizada entre as páginas lidas.')
  if (allRead.length > 0 && allRead.every((s) => s.tier === 'outro')) {
    limitations.push('As páginas lidas não são oficiais nem veículos de imprensa da nossa lista de referência.')
  }
  limitations.push('A leitura priorizou os trechos mais relevantes e densos de cada página selecionada.')

  const evidences: ApiEvidence[] = validEv.map((e) => {
    const s = sources.find((x) => x.id === e.sourceId)!
    return {
      id: e.id,
      title: s.title,
      quote: e.quote,
      context: e.context || undefined,
      claimId: e.claimId,
      sourceId: s.id,
      sourceName: s.domain,
      sourceUrl: s.url,
      date: brDate(s.publishedAt),
      foundValue: e.foundValue,
      allegedValue: e.allegedValue,
      badge: BADGE[e.stance],
      stance: e.stance,
    }
  })

  const result = buildResult({
    ...base,
    claims: withStatus(claims, out.claimStatus, evidences),
    sources,
    evidences,
    validEvidences: validEv,
    ...out,
    limitations,
  })
  deps.trace && (deps.trace.timingsMs.totalPipeline = Math.round(performance.now() - pipelineStarted))
  if (deps.trace) {
    deps.trace.budget.elapsedMs = budget.elapsedMs()
    deps.trace.budget.remainingMs = budget.remainingMs()
    deps.trace.budget.budgetExhausted = budget.exhausted() || deps.trace.budget.skippedOperations.length > 0
  }
  return result
}

function withStatus(claims: Claim[], status: Record<string, Classification>, evidences: ApiEvidence[]): Claim[] {
  return claims.map((c) => ({
    ...c,
    status: status[c.id],
    evidenceIds: evidences.filter((e) => e.claimId === c.id).map((e) => e.id),
  }))
}
