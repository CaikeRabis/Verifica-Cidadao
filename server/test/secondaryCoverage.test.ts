import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { verify, type PipelineTrace } from '../src/services/verificationService'
import { classify } from '../src/services/classification'
import type { AiService } from '../src/services/aiService'
import type { SearchProvider } from '../src/services/searchService'
import type { Claim, RawEvidence, ValidEvidence } from '../src/types'

const primaryText = 'A capital do Brasil é Brasília.'
const secondaryText = 'O Supremo Tribunal Federal possui 11 ministros.'
const urlOptions = { analyzedSource: { url: 'https://pagina.cidada.exemplo/materia', originalUrl: 'https://pagina.cidada.exemplo/materia', finalUrl: 'https://pagina.cidada.exemplo/materia', domain: 'pagina.cidada.exemplo' } }

const trace = (): PipelineTrace => ({
  timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [],
  evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0,
  retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [], selfReferenceRejections: [], secondaryRecovery: [], secondaryTargetedSearches: 0, additionalSearchRequests: 0, additionalBraveFallbackRequests: 0, secondaryRecoveryLatencyMs: 0,
})

function sourceFor(url: string) {
  if (url.includes('secondary')) return `<article>${secondaryText} ${'registro '.repeat(40)}</article>`
  return `<article>${primaryText} ${'registro '.repeat(40)}</article>`
}

function deps(drafts: { text: string; role?: 'primary' | 'secondary'; material?: boolean }[], options: { initialSecondaryCovered?: boolean; secondarySearch?: 'external' | 'self'; braveFallbackOnTarget?: boolean } = {}) {
  const calls: string[] = []
  let lastWasTarget = false
  const search: SearchProvider = {
    async search(query) {
      calls.push(query)
      lastWasTarget = query.endsWith('dados oficiais')
      if (lastWasTarget && options.secondarySearch === 'self') {
        return [{ title: 'Página analisada', url: 'https://www.pagina.cidada.exemplo/materia?utm_source=busca', domain: 'pagina.cidada.exemplo', snippet: '' }]
      }
      return [{ title: lastWasTarget ? 'STF oficial' : 'Base oficial', url: lastWasTarget ? 'https://stf.jus.br/secondary' : 'https://dados.gov.br/primary', domain: lastWasTarget ? 'stf.jus.br' : 'dados.gov.br', snippet: '' }]
    },
    takeAttempts() {
      return options.braveFallbackOnTarget && lastWasTarget
        ? [{ provider: 'duckduckgo', success: false, failureReason: 'ANTI_BOT_CHALLENGE', resultCount: 0, fallbackTriggered: true, fallbackProvider: 'brave' }, { provider: 'brave', success: true, resultCount: 1, fallbackTriggered: true, fallbackProvider: 'brave' }]
        : [{ provider: 'duckduckgo', success: true, resultCount: 1, fallbackTriggered: false }]
    },
  }
  const ai: AiService = {
    async extractClaims() { return drafts },
    async extractEvidence(claims, sources): Promise<RawEvidence[]> {
      const claim = claims[0]
      if (claims.length === 1 && claim.id === 'c2') return [{ claimId: 'c2', sourceId: sources[0].id, quote: secondaryText, context: '', stance: 'supports' }]
      const evidence: RawEvidence[] = [{ claimId: 'c1', sourceId: sources[0].id, quote: primaryText, context: '', stance: 'supports' }]
      if (options.initialSecondaryCovered) evidence.push({ claimId: 'c2', sourceId: sources[0].id, quote: secondaryText, context: '', stance: 'supports' })
      return evidence
    },
  }
  return { ai, search, calls, fetcher: async (url: string) => ({ finalUrl: url, contentType: 'text/html', body: options.initialSecondaryCovered && url.includes('primary') ? `<article>${primaryText} ${secondaryText} ${'registro '.repeat(40)}</article>` : sourceFor(url), truncated: false }) }
}

describe('Cobertura externa dirigida de secondary no modo URL', () => {
  it('não busca novamente quando a secondary material já está coberta', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: true }], { initialSecondaryCovered: true })
    const result = await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(result.classification, 'confirmada')
    assert.equal(pipelineTrace.secondaryTargetedSearches, 0)
  })

  it('faz uma única busca da própria secondary material e não reutiliza a evidência da primary', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: true }])
    const result = await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(result.classification, 'confirmada')
    assert.equal(pipelineTrace.secondaryTargetedSearches, 1)
    assert.equal(pipelineTrace.secondaryRecovery[0]?.coverageBeforeRecovery, false)
    assert.equal(pipelineTrace.secondaryRecovery[0]?.coverageAfterRecovery, true)
    assert.equal(pipelineTrace.secondaryRecovery[0]?.evidences[0]?.sourceId, 's2')
    assert.ok(pipelineTrace.secondaryRecovery[0]?.targetedQuery?.includes('supremo'))
  })

  it('não gasta rodada extra para secondary periférica', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: false }])
    const result = await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(result.classification, 'confirmada')
    assert.equal(pipelineTrace.secondaryTargetedSearches, 0)
  })

  it('limita a uma rodada adicional por secondary material', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: true }, { text: 'O Senado Federal possui 81 senadores.', role: 'secondary', material: true }])
    await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(pipelineTrace.secondaryTargetedSearches, 2)
    assert.equal(pipelineTrace.secondaryRecovery.filter((item) => item.claimId === 'c2').length, 1)
    assert.equal(pipelineTrace.secondaryRecovery.filter((item) => item.claimId === 'c3').length, 1)
  })

  it('aplica URL identity também à busca dirigida e mantém a autoconfirmação bloqueada', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: true }], { secondarySearch: 'self' })
    const result = await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(result.sources.some((source) => source.url.includes('pagina.cidada')), false)
    assert.equal(pipelineTrace.secondaryRecovery[0]?.coverageAfterRecovery, false)
    assert.equal(pipelineTrace.additionalBraveFallbackRequests, 0)
    assert.ok(pipelineTrace.selfReferenceRejections.some((item) => item.stage === 'search'))
  })

  it('mantém o fallback operacional para Brave apenas quando a busca dirigida falha', async () => {
    const pipelineTrace = trace(); const setup = deps([{ text: primaryText, role: 'primary' }, { text: secondaryText, role: 'secondary', material: true }], { braveFallbackOnTarget: true })
    await verify('url', { ...setup, trace: pipelineTrace }, urlOptions)
    assert.equal(pipelineTrace.additionalBraveFallbackRequests, 1)
    assert.equal(pipelineTrace.secondaryRecovery[0]?.fallbackUsed, true)
  })
})

describe('Agregação permanece determinística após cobertura de secondary', () => {
  const claims: Claim[] = [{ id: 'c1', text: 'Principal', role: 'primary' }, { id: 'c2', text: 'Secundária', role: 'secondary', material: true }]
  const evidence = (claimId: string, stance: 'supports' | 'contradicts'): ValidEvidence => ({ id: `${claimId}-${stance}`, claimId, sourceId: 's1', quote: 'trecho externo suficiente', context: '', stance, tier: 'oficial' })

  it('secondary contradita mantém classificação global parcialmente confirmada', () => {
    assert.equal(classify({ claims, evidences: [evidence('c1', 'supports'), evidence('c2', 'contradicts')] }).classification, 'parcialmente-confirmada')
  })

  it('secondary confirmada permite confirmação global e descoberta mantém parcial', () => {
    assert.equal(classify({ claims, evidences: [evidence('c1', 'supports'), evidence('c2', 'supports')] }).classification, 'confirmada')
    assert.equal(classify({ claims, evidences: [evidence('c1', 'supports')] }).classification, 'parcialmente-confirmada')
  })
})
