import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ApiError } from '../src/errors'
import { validateInput } from '../src/lib/input'
import { classify, classifyClaim } from '../src/services/classification'
import { quoteExistsIn, validateEvidences } from '../src/services/evidenceValidation'
import { readSources } from '../src/services/sourceReader'
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
  const c1: Claim = { id: 'c1', text: 'O repasse foi de 10 milhões' }

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
    const c: Claim = { id: 'c1', text: 'Obra foi concluída no prazo' }
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
    const sensitiveClaim: Claim = { id: 'c1', text: 'Houve fraude e corrupção no contrato da prefeitura' }
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
    const c: Claim = { id: 'c1', text: 'Texto qualquer' }
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
    const claims: Claim[] = [{ id: 'c1', text: 'Alegação' }]
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
    const claims: Claim[] = [{ id: 'c1', text: 'Alegação' }]
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
