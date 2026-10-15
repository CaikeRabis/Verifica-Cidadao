import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonicalUrlKey, isSameUrlIdentity } from '../src/lib/urlIdentity'
import { verify, type PipelineTrace } from '../src/services/verificationService'
import type { AiService } from '../src/services/aiService'
import type { SearchProvider } from '../src/services/searchService'

const trace = (): PipelineTrace => ({
  timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [],
  evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0,
  retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [], selfReferenceRejections: [],
})

describe('Identidade canônica da URL analisada', () => {
  const original = 'http://www.exemplo.gov.br/materia/?utm_source=boletim&b=2&a=1#topo'
  const final = 'https://exemplo.gov.br/materia?a=1&b=2'

  it('unifica URL exata, http/https, www, barra, fragment e encoding equivalente', () => {
    const key = canonicalUrlKey(original)
    assert.equal(key, canonicalUrlKey(final))
    assert.equal(key, canonicalUrlKey('https://EXEMPLO.gov.br/materia/?b=2&a=1#secao'))
    assert.equal(canonicalUrlKey('https://exemplo.gov.br/%7Emateria'), canonicalUrlKey('http://www.exemplo.gov.br/~materia/'))
    assert.equal(isSameUrlIdentity('https://www.exemplo.gov.br/materia/?a=1&b=2#x', [original, final]), true)
  })

  it('remove tracking params, mas preserva queries funcionais', () => {
    assert.equal(canonicalUrlKey('https://exemplo.gov.br/materia?utm_medium=x&fbclid=abc&gclid=123&a=1'), 'exemplo.gov.br/materia?a=1')
    assert.notEqual(canonicalUrlKey('https://exemplo.gov.br/materia?id=1'), canonicalUrlKey('https://exemplo.gov.br/materia?id=2'))
  })

  it('bloqueia variantes antes do ranking e preserva página distinta do mesmo domínio', async () => {
    const pipelineTrace = trace()
    const search: SearchProvider = {
      async search() {
        return [
          { title: 'Mesma', url: 'https://www.exemplo.gov.br/materia/?b=2&a=1&utm_campaign=x', domain: 'exemplo.gov.br', snippet: '' },
          { title: 'Outra página', url: 'https://exemplo.gov.br/documento-oficial', domain: 'exemplo.gov.br', snippet: '' },
        ]
      },
    }
    const ai: AiService = {
      async extractClaims() { return [{ text: 'Brasília foi inaugurada em 1960.' }] },
      async extractEvidence() { return [{ claimId: 'c1', sourceId: 's1', quote: 'Brasília foi inaugurada em 1960.', context: '', stance: 'supports' }] },
    }
    const result = await verify('consulta', {
      ai, search, trace: pipelineTrace,
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: `<article>Brasília foi inaugurada em 1960. ${'registro '.repeat(40)}</article>`, truncated: false }),
    }, {
      analyzedSource: { url: original, originalUrl: original, finalUrl: final, domain: 'exemplo.gov.br' },
    })
    assert.equal(result.sources.length, 1)
    assert.equal(result.sources[0]?.url, 'https://exemplo.gov.br/documento-oficial')
    assert.ok(pipelineTrace.selfReferenceRejections.some((item) => item.stage === 'search' && item.reason === 'ANALYZED_SOURCE_SELF_REFERENCE'))
  })

  it('remove redirect equivalente após fetch e rejeita uma evidência que tente usá-lo', async () => {
    const pipelineTrace = trace()
    const analyzedFinal = 'https://exemplo.gov.br/materia-final'
    const search: SearchProvider = {
      async search() {
        return [
          { title: 'Redirect', url: 'https://ponte.example/ir', domain: 'ponte.example', snippet: '' },
          { title: 'Fonte externa', url: 'https://dados.gov.br/documento', domain: 'dados.gov.br', snippet: '' },
        ]
      },
    }
    const ai: AiService = {
      async extractClaims() { return [{ text: 'Brasília foi inaugurada em 1960.' }] },
      async extractEvidence() {
        return [
          { claimId: 'c1', sourceId: 's1', quote: 'Brasília foi inaugurada em 1960.', context: '', stance: 'supports' },
          { claimId: 'c1', sourceId: 's2', quote: 'Brasília foi inaugurada em 1960.', context: '', stance: 'supports' },
        ]
      },
    }
    const result = await verify('consulta', {
      ai, search, trace: pipelineTrace,
      fetcher: async (url) => ({
        finalUrl: url.includes('ponte.example') ? analyzedFinal : url,
        contentType: 'text/html', body: `<article>Brasília foi inaugurada em 1960. ${'registro '.repeat(40)}</article>`, truncated: false,
      }),
    }, {
      analyzedSource: { url: 'https://exemplo.gov.br/materia', originalUrl: 'https://exemplo.gov.br/materia', finalUrl: analyzedFinal, domain: 'exemplo.gov.br' },
    })
    assert.ok(result.sources.every((source) => source.url !== analyzedFinal))
    assert.ok(result.evidences.every((evidence) => evidence.sourceUrl !== analyzedFinal))
    assert.ok(pipelineTrace.selfReferenceRejections.some((item) => item.stage === 'source'))
    assert.ok(pipelineTrace.selfReferenceRejections.some((item) => item.stage === 'evidence'))
    assert.ok(pipelineTrace.rejectedEvidences.some((item) => item.reason === 'ANALYZED_SOURCE_SELF_REFERENCE'))
  })
})
