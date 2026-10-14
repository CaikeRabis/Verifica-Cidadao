import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ApiError, SearchUnavailableError } from '../src/errors'
import { validateInput } from '../src/lib/input'
import { classify, classifyClaim } from '../src/services/classification'
import { quoteExistsIn, validateEvidences } from '../src/services/evidenceValidation'
import { readSources } from '../src/services/sourceReader'
import { generateSearchQueries } from '../src/lib/queryGeneration'
import { rankForClaim, selectSources } from '../src/lib/sourceRanking'
import { resolveSafeRedirect, validatePublicUrl } from '../src/lib/safeFetch'
import { normalizeClaims, verify, type PipelineTrace } from '../src/services/verificationService'
import type { AiService } from '../src/services/aiService'
import { ControlledFallbackSearchProvider, type SearchProvider } from '../src/services/searchService'
import { recoverDeterministicEvidence } from '../src/services/deterministicEvidenceRecovery'
import type { Candidate } from '../src/lib/sourceRanking'
import type { Claim, RawEvidence, SourceDoc, ValidEvidence } from '../src/types'

function pipelineTrace(): PipelineTrace {
  return {
    timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [],
    evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0,
    retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [],
  }
}

describe('1. Validação de input', () => {
  it('rejeita input não string ou ausente', () => {
    assert.throws(() => validateInput(null), (e: unknown) => e instanceof ApiError && e.status === 400)
    assert.throws(() => validateInput({}), (e: unknown) => e instanceof ApiError && e.status === 400)
    assert.throws(() => validateInput({ input: 123 }), (e: unknown) => e instanceof ApiError && e.status === 400)
  })

  it('rejeita texto muito curto (< 10 caracteres)', () => {
    assert.throws(
      () => validateInput({ input: 'curto' }),
      (e: unknown) => e instanceof ApiError && e.status === 400,
    )
  })

  it('rejeita texto muito longo (> 3000 caracteres)', () => {
    assert.throws(
      () => validateInput({ input: 'a'.repeat(3001) }),
      (e: unknown) => e instanceof ApiError && e.status === 400,
    )
  })

  it('rejeita URL isolada orientando colar texto', () => {
    assert.throws(
      () => validateInput({ input: 'https://noticia.gov.br/artigo' }),
      (e: unknown) => e instanceof ApiError && e.status === 422 && e.code === 'unsupported_format',
    )
  })

  it('aceita e normaliza texto válido', () => {
    const text = validateInput({ input: '  O governo anunciou novo repasse para hospitais em 2024.  ' })
    assert.equal(text, 'O governo anunciou novo repasse para hospitais em 2024.')
  })
})

describe('2. Classificação básica', () => {
  const c1: Claim = { id: 'c1', text: 'O repasse foi de 10 milhões', role: 'primary' }

  it('classifica como confirmada quando evidência oficial sustenta sem contradição', () => {
    const ev: ValidEvidence = {
      id: 'e1',
      claimId: 'c1',
      sourceId: 's1',
      quote: 'repasse foi de 10 milhões',
      context: '',
      stance: 'supports',
      tier: 'oficial',
    }
    const verdict = classifyClaim(c1, [ev])
    assert.equal(verdict.status, 'confirmada')

    const out = classify({ claims: [c1], evidences: [ev] })
    assert.equal(out.classification, 'confirmada')
    assert.equal(out.confidence, 'alta')
  })

  it('classifica como contradita quando evidência de veículo ou oficial contradiz diretamente', () => {
    const ev: ValidEvidence = {
      id: 'e1',
      claimId: 'c1',
      sourceId: 's1',
      quote: 'o valor real foi de 2 milhões',
      context: '',
      stance: 'contradicts',
      tier: 'jornalismo',
    }
    const verdict = classifyClaim(c1, [ev])
    assert.equal(verdict.status, 'contradita')

    const out = classify({ claims: [c1], evidences: [ev] })
    assert.equal(out.classification, 'contradita')
  })

  it('classifica como sem-evidencias quando trechos não sustentam nem contradizem', () => {
    const out = classify({ claims: [c1], evidences: [] })
    assert.equal(out.classification, 'sem-evidencias')
    assert.equal(out.confidence, 'baixa')
  })
})

describe('3. Fallback para análise humana', () => {
  it('cai para analise-humana se nenhuma claim for verificável', () => {
    const out = classify({ claims: [], evidences: [] })
    assert.equal(out.classification, 'analise-humana')
    assert.ok(out.humanReason?.includes('afirmação factual'))
  })

  it('cai para analise-humana quando fontes de mesmo peso entram em conflito', () => {
    const c: Claim = { id: 'c1', text: 'Obra foi concluída no prazo', role: 'primary' }
    const ev1: ValidEvidence = {
      id: 'e1',
      claimId: 'c1',
      sourceId: 's1',
      quote: 'obra concluída no prazo',
      context: '',
      stance: 'supports',
      tier: 'oficial',
    }
    const ev2: ValidEvidence = {
      id: 'e2',
      claimId: 'c1',
      sourceId: 's2',
      quote: 'obra não foi concluída',
      context: '',
      stance: 'contradicts',
      tier: 'oficial',
    }
    const verdict = classifyClaim(c, [ev1, ev2])
    assert.equal(verdict.status, 'analise-humana')
  })

  it('preserva conflito documental identificado em fixture controlada', () => {
    const claim: Claim = {
      id: 'obra-ponte-central',
      text: 'A obra Ponte Central foi concluída em 10/03/2024.',
      role: 'primary',
    }
    const documentoA: ValidEvidence = {
      id: 'documento-a',
      claimId: claim.id,
      sourceId: 'relatorio-obras-2024',
      quote: 'Documento A — Relatório de Obras 2024: conclusão da Ponte Central em 10/03/2024.',
      context: 'Documento oficial A, emitido pela Secretaria de Obras.',
      stance: 'supports',
      tier: 'oficial',
    }
    const documentoB: ValidEvidence = {
      id: 'documento-b',
      claimId: claim.id,
      sourceId: 'termo-recebimento-2024',
      quote: 'Documento B — Termo de Recebimento: conclusão da Ponte Central em 15/04/2024.',
      context: 'Documento oficial B, emitido pela Secretaria de Obras.',
      stance: 'contradicts',
      tier: 'oficial',
    }

    assert.equal(classifyClaim(claim, [documentoA, documentoB]).status, 'analise-humana')
  })

  it('cai para analise-humana diante de suporte e contradição fortes, ainda que não oficiais', () => {
    const c: Claim = { id: 'c1', text: 'A obra foi concluída no prazo.', role: 'primary' }
    const evidence = (id: string, stance: 'supports' | 'contradicts'): ValidEvidence => ({
      id, claimId: 'c1', sourceId: id, quote: 'trecho documental relevante sobre a obra concluída',
      context: '', stance, tier: 'jornalismo',
    })
    assert.equal(classifyClaim(c, [evidence('s1', 'supports'), evidence('s2', 'contradicts')]).status, 'analise-humana')
  })

  it('cai para analise-humana se a afirmação contiver imputação de crime/fraude/corrupção', () => {
    const sensitiveClaim: Claim = { id: 'c1', text: 'Houve fraude e corrupção no contrato da prefeitura', role: 'primary' }
    const ev: ValidEvidence = {
      id: 'e1',
      claimId: 'c1',
      sourceId: 's1',
      quote: 'auditoria apura o contrato',
      context: '',
      stance: 'supports',
      tier: 'oficial',
    }
    const verdict = classifyClaim(sensitiveClaim, [ev])
    assert.equal(verdict.status, 'analise-humana')
  })

  it('cai para analise-humana quando nenhuma fonte pôde ser lida', () => {
    const c: Claim = { id: 'c1', text: 'Texto qualquer', role: 'primary' }
    const out = classify({ claims: [c], evidences: [], noSourcesRead: true })
    assert.equal(out.classification, 'analise-humana')
  })
})

describe('4. Evidência com quote inexistente deve ser descartada', () => {
  it('detecta se quote existe no texto ignorando caixa e pontuação', () => {
    const text = 'O Ministério da Saúde publicou a portaria GM 892 liberando 45 milhões de reais.'
    assert.equal(quoteExistsIn('portaria GM 892 liberando 45 milhões', text), true)
    assert.equal(quoteExistsIn('PORTARIA gm 892 LIBERANDO 45 MILHÕES', text), true)
    assert.equal(quoteExistsIn('o valor foi de 200 bilhões de dólares', text), false)
  })

  it('descarta evidência quando o quote não existe literalmente no texto lido da fonte', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'Alegação', role: 'primary' }]
    const sources: SourceDoc[] = [
      {
        id: 's1',
        title: 'Fonte 1',
        url: 'https://exemplo.gov.br/doc',
        domain: 'exemplo.gov.br',
        tier: 'oficial',
        readStatus: 'read',
        accessedAt: '2026-10-12T00:00:00Z',
        text: 'Texto real lido da página com informações verdadeiras e completas.',
      },
    ]

    const hallucinatedEvidence: RawEvidence = {
      claimId: 'c1',
      sourceId: 's1',
      quote: 'FRASE INVENTADA PELA IA QUE NÃO EXISTE NA PÁGINA',
      context: 'Contexto',
      stance: 'supports',
    }

    const { valid, discarded } = validateEvidences([hallucinatedEvidence], claims, sources)
    assert.equal(valid.length, 0)
    assert.equal(discarded, 1)
  })

  it('descarta evidência se a fonte associada não foi lida', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'Alegação', role: 'primary' }]
    const sources: SourceDoc[] = [
      {
        id: 's1',
        title: 'Fonte 1',
        url: 'https://exemplo.gov.br/doc',
        domain: 'exemplo.gov.br',
        tier: 'oficial',
        readStatus: 'snippet-only',
        accessedAt: '2026-10-12T00:00:00Z',
      },
    ]
    const ev: RawEvidence = {
      claimId: 'c1',
      sourceId: 's1',
      quote: 'qualquer coisa com tamanho suficiente',
      context: '',
      stance: 'supports',
    }
    const { valid, discarded } = validateEvidences([ev], claims, sources)
    assert.equal(valid.length, 0)
    assert.equal(discarded, 1)
  })
})

describe('5. Fonte não lida não deve aparecer como read', () => {
  it('marca como snippet-only ou unavailable quando o download falha', async () => {
    const candidates: Candidate[] = [
      {
        title: 'Página Boa',
        url: 'https://boa.gov.br/artigo',
        domain: 'boa.gov.br',
        snippet: 'snippet da página boa',
        tier: 'oficial',
      },
      {
        title: 'Página Que Falha',
        url: 'https://falha.com/artigo',
        domain: 'falha.com',
        snippet: 'snippet da página que falhou',
        tier: 'outro',
      },
    ]

    const mockFetcher = async (url: string) => {
      if (url.includes('boa')) {
        return {
          finalUrl: url,
          contentType: 'text/html',
          body: '<title>Página Boa</title><article>' + 'Texto longo da página oficial '.repeat(20) + '</article>',
          truncated: false,
        }
      }
      throw new Error('Falha de conexão')
    }

    const docs = await readSources(candidates, mockFetcher)
    assert.equal(docs.length, 2)
    assert.equal(docs[0].readStatus, 'read')
    assert.ok(docs[0].text && docs[0].text.length > 100)
    assert.equal(docs[1].readStatus, 'snippet-only')
    assert.equal(docs[1].text, undefined)
  })
})

describe('6. Regras v0.2 de classificação e agregação', () => {
  const evidence = (claimId: string, stance: ValidEvidence['stance'], sourceId = 's1'): ValidEvidence => ({
    id: `${claimId}-${stance}-${sourceId}`,
    claimId,
    sourceId,
    quote: 'Trecho institucional verificável.',
    context: '',
    stance,
    tier: 'oficial',
  })

  it('prioriza claim principal contradita mesmo quando a secundária é confirmada', () => {
    const claims: Claim[] = [
      { id: 'c1', text: 'O salário mínimo em 2024 foi R$ 5.000.', role: 'primary' },
      { id: 'c2', text: 'O salário mínimo foi definido pelo governo federal.', role: 'secondary' },
    ]
    const out = classify({ claims, evidences: [evidence('c1', 'contradicts'), evidence('c2', 'supports', 's2')] })
    assert.equal(out.claimStatus.c1, 'contradita')
    assert.equal(out.claimStatus.c2, 'confirmada')
    assert.equal(out.classification, 'contradita')
  })

  it('classifica entrada composta como parcialmente confirmada quando há uma claim sustentada e outra contradita', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'Brasília foi inaugurada em 1960.', role: 'primary' }, { id: 'c2', text: 'Brasília é a cidade mais populosa.', role: 'secondary' }]
    const out = classify({ claims, evidences: [evidence('c1', 'supports'), evidence('c2', 'contradicts', 's2')] })
    assert.equal(out.classification, 'parcialmente-confirmada')
  })

  it('mantém confirmada quando principal e secundária são confirmadas', () => {
    const claims: Claim[] = [
      { id: 'c1', text: 'O Senado possui 81 senadores.', role: 'primary' },
      { id: 'c2', text: 'Cada unidade federativa elege três senadores.', role: 'secondary' },
    ]
    const out = classify({ claims, evidences: [evidence('c1', 'supports'), evidence('c2', 'supports', 's2')] })
    assert.equal(out.classification, 'confirmada')
  })

  it('mantém sem evidências quando a principal não tem base, mesmo com secundária confirmada', () => {
    const claims: Claim[] = [
      { id: 'c1', text: 'O programa reduziu pela metade a espera em hospitais.', role: 'primary' },
      { id: 'c2', text: 'A portaria foi publicada pelo ministério.', role: 'secondary' },
    ]
    const out = classify({ claims, evidences: [evidence('c2', 'supports', 's2')] })
    assert.equal(out.claimStatus.c1, 'sem-evidencias')
    assert.equal(out.classification, 'sem-evidencias')
  })

  it('mantém análise humana quando a principal exige análise humana', () => {
    const claims: Claim[] = [
      { id: 'c1', text: 'Houve fraude comprovada no contrato.', role: 'primary' },
      { id: 'c2', text: 'O contrato foi publicado no portal.', role: 'secondary' },
    ]
    const out = classify({ claims, evidences: [evidence('c1', 'supports'), evidence('c2', 'supports', 's2')] })
    assert.equal(out.claimStatus.c1, 'analise-humana')
    assert.equal(out.classification, 'analise-humana')
  })

  it('atribui role primary à única claim e faz fallback quando a IA não informa roles', () => {
    const single = normalizeClaims([{ text: 'Brasília foi inaugurada em 1960.' }])
    assert.deepEqual(single.map((claim) => claim.role), ['primary'])

    const fallback = normalizeClaims([
      { text: 'O salário mínimo em 2024 foi R$ 5.000.' },
      { text: 'O salário mínimo foi definido pelo governo federal.' },
    ])
    assert.deepEqual(fallback.map((claim) => claim.role), ['primary', 'secondary'])

    const invalidRole = normalizeClaims([{ text: 'Uma única afirmação.', role: 'invalid' as never }])
    assert.equal(invalidRole[0].role, 'primary')
  })

  it('documenta que valores e datas dependem do stance fornecido pela IA', () => {
    const claim: Claim = { id: 'c1', text: 'O salário mínimo em 2024 foi R$ 5.000.', role: 'primary' }
    const out = classify({ claims: [claim], evidences: [evidence('c1', 'supports')] })
    assert.equal(out.classification, 'confirmada')
    // A classificação isolada recebe stances já validados; a comparação literal ocorre em evidenceValidation.
  })
})

describe('7. Infraestrutura de alto valor', () => {
  it('bloqueia localhost, IP privado e redirect para destino privado', () => {
    assert.throws(() => validatePublicUrl('http://localhost'), /host local/i)
    assert.throws(() => validatePublicUrl('http://127.0.0.1'), /IP privado/i)
    assert.throws(() => resolveSafeRedirect('http://169.254.169.254/latest/meta-data', new URL('https://exemplo.gov.br')), /IP privado/i)
  })

  it('prioriza fonte oficial e evita concentrar a seleção no mesmo domínio-base', () => {
    const results = [
      { title: 'Notícia', url: 'https://portal.com/a', domain: 'portal.com', snippet: 'senado composição' },
      { title: 'Senado Federal', url: 'https://www.senado.leg.br/b', domain: 'www.senado.leg.br', snippet: '81 senadores' },
      { title: 'Outra página Senado', url: 'https://noticias.senado.leg.br/c', domain: 'noticias.senado.leg.br', snippet: 'composição' },
      { title: 'Câmara', url: 'https://camara.leg.br/d', domain: 'camara.leg.br', snippet: 'Congresso' },
    ]
    assert.equal(rankForClaim(results, 3, 'Senado tem 81 senadores')[0].tier, 'oficial')
    const selected = selectSources([{ results, claimText: 'Senado tem 81 senadores' }], 3, 3)
    assert.equal(selected.filter((item) => item.domain.endsWith('senado.leg.br')).length, 1)
  })

  it('gera consultas complementar literal, institucional e oficial', () => {
    const queries = generateSearchQueries('O Senado Federal possui 81 senadores.')
    assert.ok(queries.length >= 2)
    assert.ok(queries.some((query) => query.includes('site:senado.leg.br')))
  })

  it('executa segunda rodada quando a primeira não produz evidência válida', async () => {
    const calls: string[] = []
    let searchCount = 0
    const ai: AiService = {
      async extractClaims() { return [{ text: 'Brasília foi inaugurada em 1960.' }] },
      async extractEvidence(_claims, sources) {
        if (sources.some((source) => source.url.includes('/segunda'))) {
          return [{ claimId: 'c1', sourceId: sources[0].id, quote: 'Brasília foi inaugurada em 1960.', context: '', stance: 'supports' }]
        }
        return []
      },
    }
    const search: SearchProvider = {
      async search(query) {
        calls.push(query)
        searchCount++
        return searchCount > 3
          ? [{ title: 'Fonte segunda', url: 'https://dados.gov.br/segunda', domain: 'dados.gov.br', snippet: 'Brasília foi inaugurada em 1960.' }]
          : [{ title: 'Fonte inicial', url: 'https://planalto.gov.br/inicial', domain: 'planalto.gov.br', snippet: 'Brasília foi inaugurada em 1960.' }]
      },
    }
    const result = await verify('Brasília foi inaugurada em 1960.', {
      ai,
      search,
      fetcher: async (url) => ({
        finalUrl: url, contentType: 'text/html',
        body: url.includes('/segunda')
          ? `<article>Brasília foi inaugurada em 1960. ${'texto '.repeat(50)}</article>`
          : `<article>História administrativa da capital. ${'texto '.repeat(50)}</article>`,
        truncated: false,
      }),
    })
    assert.equal(result.classification, 'confirmada')
    assert.ok(result.limitations.some((item) => item.includes('segunda rodada')))
    assert.ok(calls.some((query) => query.includes('dados oficiais')))
  })
})

describe('8. Retry controlado de extrações estruturadas', () => {
  const input = 'Brasília foi inaugurada em 1960.'
  const source = { title: 'Registro oficial', url: 'https://dados.gov.br/registro', domain: 'dados.gov.br', snippet: 'Brasília foi inaugurada em 1960.' }
  const fetcher = async (url: string) => ({
    finalUrl: url, contentType: 'text/html', body: `<article>Brasília foi inaugurada em 1960. ${'registro '.repeat(40)}</article>`, truncated: false,
  })
  const evidence = (): RawEvidence => ({ claimId: 'c1', sourceId: 's1', quote: 'Brasília foi inaugurada em 1960.', context: '', stance: 'supports' })

  it('não repete extração de claims nem de evidência quando a primeira tentativa é válida', async () => {
    let claimCalls = 0
    let evidenceCalls = 0
    const trace = pipelineTrace()
    const result = await verify(input, {
      ai: {
        async extractClaims() { claimCalls++; return [{ text: input }] },
        async extractEvidence() { evidenceCalls++; return [evidence()] },
      },
      search: { async search() { return [source] } }, fetcher, trace,
    })
    assert.equal(result.classification, 'confirmada')
    assert.equal(claimCalls, 1)
    assert.equal(evidenceCalls, 1)
    assert.equal(trace.retries.extraAiCalls, 0)
  })

  it('repete claims uma única vez quando a primeira resposta é vazia e continua com a claim válida', async () => {
    let claimCalls = 0
    const trace = pipelineTrace()
    const result = await verify(input, {
      ai: {
        async extractClaims() { claimCalls++; return claimCalls === 1 ? [] : [{ text: input }] },
        async extractEvidence() { return [evidence()] },
      },
      search: { async search() { return [source] } }, fetcher, trace,
    })
    assert.equal(result.classification, 'confirmada')
    assert.equal(claimCalls, 2)
    assert.equal(trace.retries.claims?.retryReason, 'ZERO_VALID_CLAIMS')
    assert.equal(trace.aiCalls.filter((call) => call.purpose === 'claim-extraction').length, 2)
  })

  it('para após a segunda extração de claims vazia, sem fazer busca', async () => {
    let claimCalls = 0
    let searchCalls = 0
    const trace = pipelineTrace()
    const result = await verify(input, {
      ai: {
        async extractClaims() { claimCalls++; return [] },
        async extractEvidence() { return [] },
      },
      search: { async search() { searchCalls++; return [source] } }, fetcher, trace,
    })
    assert.equal(result.classification, 'analise-humana')
    assert.equal(claimCalls, 2)
    assert.equal(searchCalls, 0)
    assert.equal(trace.retries.extraAiCalls, 1)
  })

  it('repete evidência uma vez para primary descoberta, reutilizando as fontes e sem nova busca ou fetch', async () => {
    let evidenceCalls = 0
    let searchCalls = 0
    let fetchCalls = 0
    const trace = pipelineTrace()
    const result = await verify(input, {
      ai: {
        async extractClaims() { return [{ text: input }] },
        async extractEvidence(_claims, _sources, options) { evidenceCalls++; return options?.retry ? [evidence()] : [] },
      },
      search: { async search() { searchCalls++; return [source] } },
      fetcher: async (url) => { fetchCalls++; return fetcher(url) },
      trace,
    })
    assert.equal(result.classification, 'confirmada')
    assert.equal(evidenceCalls, 2)
    assert.equal(searchCalls, 3)
    assert.equal(fetchCalls, 1)
    assert.equal(trace.retries.evidence[0]?.retryReason, 'PRIMARY_WITHOUT_VALID_EVIDENCE')
    assert.equal(trace.retries.evidence[0]?.acceptedAttempt2, 1)
    assert.deepEqual(trace.retries.evidence[0]?.reusedSources, ['s1'])
  })

  it('não repete evidência sem fonte lida e mantém retry inválido sujeito à validação normal', async () => {
    let noReadEvidenceCalls = 0
    const noReadTrace = pipelineTrace()
    await verify(input, {
      ai: {
        async extractClaims() { return [{ text: input }] },
        async extractEvidence() { noReadEvidenceCalls++; return [] },
      },
      search: { async search() { return [source] } },
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: '', truncated: false }),
      trace: noReadTrace,
    })
    assert.equal(noReadEvidenceCalls, 0)
    assert.equal(noReadTrace.retries.evidence.length, 0)

    let invalidCalls = 0
    const invalidTrace = pipelineTrace()
    const invalid = await verify(input, {
      ai: {
        async extractClaims() { return [{ text: input }] },
        async extractEvidence(_claims, _sources, options) { invalidCalls++; return options?.retry ? [{ ...evidence(), quote: 'quote inexistente' }] : [] },
      },
      search: { async search() { return [source] } }, fetcher, trace: invalidTrace,
    })
    assert.equal(invalid.classification, 'sem-evidencias')
    assert.equal(invalidCalls, 2)
    assert.equal(invalidTrace.retries.evidence[0]?.acceptedAttempt2, 0)
    assert.ok(invalidTrace.rejectedEvidences.some((item) => item.reason === 'QUOTE_NOT_IN_SOURCE'))
  })
})

describe('9. Fallback operacional DDG → Brave', () => {
  const result = { title: 'Registro oficial', url: 'https://dados.gov.br/registro', domain: 'dados.gov.br', snippet: 'Registro oficial.' }

  it('mantém DDG quando ele responde, sem consumir Brave', async () => {
    let braveCalls = 0
    const provider = new ControlledFallbackSearchProvider(
      { async search() { return [result] } },
      { async search() { braveCalls++; return [result] } },
    )
    assert.deepEqual(await provider.search('consulta', 6), [result])
    assert.equal(braveCalls, 0)
    assert.deepEqual(provider.takeAttempts(), [{ provider: 'duckduckgo', success: true, resultCount: 1, fallbackTriggered: false }])
  })

  it('aciona Brave somente após falha operacional do DDG e registra o motivo', async () => {
    const provider = new ControlledFallbackSearchProvider(
      { async search() { throw new SearchUnavailableError('desafio', 'ANTI_BOT_CHALLENGE') } },
      { async search() { return [{ ...result, url: 'https://brave.example/fonte', domain: 'brave.example', provider: 'brave' as const }] } },
    )
    const results = await provider.search('consulta', 6)
    assert.equal(results[0]?.provider, 'brave')
    const attempts = provider.takeAttempts()
    assert.equal(attempts[0]?.failureReason, 'ANTI_BOT_CHALLENGE')
    assert.equal(attempts[0]?.fallbackTriggered, true)
    assert.equal(attempts[1]?.provider, 'brave')
    assert.equal(attempts[1]?.success, true)
  })

  it('não aciona Brave quando DDG funciona mas a evidência posterior é insuficiente', async () => {
    let braveCalls = 0
    const provider = new ControlledFallbackSearchProvider(
      { async search() { return [result] } },
      { async search() { braveCalls++; return [result] } },
    )
    const claimText = 'Brasília foi inaugurada em 1960.'
    const output = await verify(claimText, {
      ai: { async extractClaims() { return [{ text: claimText }] }, async extractEvidence() { return [] } },
      search: provider,
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: `<article>${'sem evidência '.repeat(50)}</article>`, truncated: false }),
    })
    assert.equal(output.classification, 'sem-evidencias')
    assert.equal(braveCalls, 0)
  })

  it('falha de forma conservadora quando Brave também está indisponível', async () => {
    const provider = new ControlledFallbackSearchProvider(
      { async search() { throw new SearchUnavailableError('rede', 'NETWORK_FAILURE') } },
      { async search() { throw new SearchUnavailableError('brave fora', 'NETWORK_FAILURE') } },
    )
    await assert.rejects(() => provider.search('consulta', 6), SearchUnavailableError)
    const attempts = provider.takeAttempts()
    assert.equal(attempts.length, 2)
    assert.equal(attempts[1]?.provider, 'brave')
    assert.equal(attempts[1]?.success, false)
  })

  it('expõe no trace a origem do resultado Brave sem conceder confiança extra', async () => {
    const claimText = 'Brasília foi inaugurada em 1960.'
    const trace = pipelineTrace()
    const provider = new ControlledFallbackSearchProvider(
      { async search() { throw new SearchUnavailableError('desafio', 'ANTI_BOT_CHALLENGE') } },
      { async search() { return [{ ...result, provider: 'brave' as const }] } },
    )
    const output = await verify(claimText, {
      ai: { async extractClaims() { return [{ text: claimText }] }, async extractEvidence() { return [] } },
      search: provider,
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: `<article>${'sem evidência '.repeat(50)}</article>`, truncated: false }),
      trace,
    })
    assert.equal(output.classification, 'sem-evidencias')
    assert.ok(trace.searchAttempts.some((attempt) => attempt.provider === 'brave' && attempt.success))
    assert.ok(trace.searchAttempts.every((attempt) => !JSON.stringify(attempt).includes('BRAVE_API_KEY')))
  })
})

describe('10. Recuperação determinística de evidência estruturada', () => {
  const claim: Claim = { id: 'c1', text: 'O salário mínimo nacional em 2024 foi de R$ 5.000.', role: 'primary' }
  const literal = 'A partir de 1º de janeiro de 2024, o valor do salário mínimo será de R$ 1.412,00.'
  const source: SourceDoc = {
    id: 's1', title: 'Decreto', url: 'https://planalto.gov.br/decreto', domain: 'planalto.gov.br', tier: 'oficial',
    readStatus: 'read', accessedAt: '2024-01-01T00:00:00.000Z', text: literal,
  }

  it('recupera literalmente o fato estruturado e preserva a contradição', () => {
    const recovered = recoverDeterministicEvidence(claim, [source])
    assert.equal(recovered.evidence?.quote, literal)
    assert.equal(recovered.evidence?.stance, 'contradicts')
    assert.equal(recovered.evidence?.evidenceSource, 'deterministic-window')
    assert.equal(recovered.trace.deterministicEvidenceRecovered, true)
    assert.equal(source.text?.includes(recovered.evidence?.quote ?? ''), true)
  })

  it('não recupera quando o objeto, o período ou a entidade divergem', () => {
    const differentObject = { ...source, text: 'Em 2024, o salário de benefício será de R$ 1.412,00.' }
    const differentPeriod = { ...source, text: 'Em 2023, o valor do salário mínimo será de R$ 1.412,00.' }
    const differentEntity = { ...source, text: 'Em 2024, o Senado terá R$ 1.412,00 destinados a ministros.' }
    assert.equal(recoverDeterministicEvidence(claim, [differentObject]).evidence, undefined)
    assert.equal(recoverDeterministicEvidence(claim, [differentPeriod]).evidence, undefined)
    assert.equal(recoverDeterministicEvidence(claim, [differentEntity]).evidence, undefined)
  })

  it('não recupera quando há mais de um valor estruturado no mesmo trecho', () => {
    const ambiguous = { ...source, text: 'Em 2024, o valor do salário mínimo será de R$ 1.412,00 e o valor diário será de R$ 47,07.' }
    assert.equal(recoverDeterministicEvidence(claim, [ambiguous]).evidence, undefined)
    assert.equal(recoverDeterministicEvidence(claim, [ambiguous]).trace.recoveryReason, 'NO_LITERAL_STRUCTURED_FACT')
  })

  it('não recupera se só seria possível parafrasear o fato', () => {
    const indirect = { ...source, text: 'Em 2024, o governo publicou normas sobre o salário mínimo.' }
    assert.equal(recoverDeterministicEvidence(claim, [indirect]).evidence, undefined)
  })

  it('só roda após IA e retry falharem, sem nova busca, fetch ou IA', async () => {
    let searches = 0; let fetches = 0; let evidenceCalls = 0
    const trace = pipelineTrace()
    const output = await verify(claim.text, {
      ai: {
        async extractClaims() { return [claim] },
        async extractEvidence() { evidenceCalls++; return [] },
      },
      search: { async search() { searches++; return [{ title: source.title, url: source.url, domain: source.domain, snippet: literal }] } },
      fetcher: async (url) => { fetches++; return { finalUrl: url, contentType: 'text/html', body: `<article>${source.text} ${'registro '.repeat(50)}</article>`, truncated: false } },
      trace,
    })
    assert.equal(output.classification, 'contradita')
    assert.equal(evidenceCalls, 2)
    assert.equal(searches, 3)
    assert.equal(fetches, 1)
    assert.equal(trace.deterministicRecoveries[0]?.deterministicEvidenceRecovered, true)
    assert.equal(trace.acceptedEvidenceTrace[0]?.evidenceSource, 'deterministic-window')
  })

  it('não é acionada quando a IA já entregou um quote válido', async () => {
    const trace = pipelineTrace()
    const output = await verify(claim.text, {
      ai: {
        async extractClaims() { return [claim] },
        async extractEvidence() { return [{ claimId: 'c1', sourceId: 's1', quote: literal, context: '', stance: 'contradicts' }] },
      },
      search: { async search() { return [{ title: source.title, url: source.url, domain: source.domain, snippet: literal }] } },
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: `<article>${source.text} ${'registro '.repeat(50)}</article>`, truncated: false }),
      trace,
    })
    assert.equal(output.classification, 'contradita')
    assert.equal(trace.deterministicRecoveries.length, 0)
  })
})
