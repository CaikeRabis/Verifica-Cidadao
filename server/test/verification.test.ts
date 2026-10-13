import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ApiError } from '../src/errors'
import { validateInput } from '../src/lib/input'
import { classify, classifyClaim } from '../src/services/classification'
import { quoteExistsIn, validateEvidences } from '../src/services/evidenceValidation'
import { readSources } from '../src/services/sourceReader'
import { generateSearchQueries } from '../src/lib/queryGeneration'
import { rankForClaim, selectSources } from '../src/lib/sourceRanking'
import { resolveSafeRedirect, validatePublicUrl } from '../src/lib/safeFetch'
import { normalizeClaims, verify } from '../src/services/verificationService'
import type { AiService } from '../src/services/aiService'
import type { SearchProvider } from '../src/services/searchService'
import type { Candidate } from '../src/lib/sourceRanking'
import type { Claim, RawEvidence, SourceDoc, ValidEvidence } from '../src/types'

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
    // A regra ainda não compara R$ 5.000 com o valor literal da fonte: esse é escopo da v0.2-2.
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
      fetcher: async (url) => ({ finalUrl: url, contentType: 'text/html', body: `<article>Brasília foi inaugurada em 1960. ${'texto '.repeat(50)}</article>`, truncated: false }),
    })
    assert.equal(result.classification, 'confirmada')
    assert.ok(result.limitations.some((item) => item.includes('segunda rodada')))
    assert.ok(calls.some((query) => query.includes('dados oficiais')))
  })
})
