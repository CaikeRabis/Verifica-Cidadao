import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareFactualClaim, extractFactualEntities } from '../src/lib/factualComparison'
import { temporalApplicability, validateEvidences } from '../src/services/evidenceValidation'
import type { Claim, RawEvidence, SourceDoc } from '../src/types'

const compare = (claim: string, evidence: string) => compareFactualClaim(claim, evidence)?.stance

describe('Comparação factual determinística v0.2.1', () => {
  it('normaliza valores monetários brasileiros', () => {
    const entities = extractFactualEntities('O valor foi R$ 1.412,00.')
    assert.deepEqual(entities, [{ kind: 'money', raw: 'R$ 1.412,00', value: '1412' }])
    assert.equal(compare('O salário mínimo foi R$ 1.412.', 'O salário mínimo em vigor foi R$ 1.412,00.'), 'supports')
    assert.equal(compare('O salário mínimo foi R$ 5.000.', 'O salário mínimo em vigor foi R$ 1.412.'), 'contradicts')
  })

  it('compara contagens apenas com contexto factual compartilhado', () => {
    assert.equal(compare('O STF possui 11 ministros.', 'O STF é composto por 11 ministros.'), 'supports')
    assert.equal(compare('O STF possui 50 ministros.', 'O STF é composto por 11 ministros.'), 'contradicts')
    assert.equal(compare('O STF é composto por 15 ministros.', 'O STF é composto por 11 ministros.'), 'contradicts')
  })

  it('associa contagens ao objeto factual correto', () => {
    assert.equal(compare('O Senado possui 81 senadores.', 'O Senado é composto por 81 senadores e representa 26 estados.'), 'supports')
    assert.equal(compare('O Senado possui 81 senadores.', 'O Senado é composto por 80 senadores.'), 'contradicts')
    assert.equal(compare('O STF possui 11 ministros.', 'O STF é composto por 11 ministros.'), 'supports')
    assert.equal(compare('O STF possui 15 ministros.', 'O STF é composto por 11 ministros.'), 'contradicts')
    assert.equal(compare('O STF possui 11 ministros.', 'O STF julgou 11 processos.'), undefined)
    assert.equal(compare('O Senado possui 81 senadores.', 'O artigo 81 da Constituição trata do Senado.'), undefined)
  })

  it('normaliza datas completas entre formatos e detecta divergência', () => {
    assert.equal(compare('Brasília foi inaugurada em 21/04/1960.', 'Brasília foi inaugurada em 21 de abril de 1960.'), 'supports')
    assert.equal(compare('Brasília foi inaugurada em 21/04/1961.', 'Brasília foi inaugurada em 21 de abril de 1960.'), 'contradicts')
  })

  it('compara percentuais do mesmo fato', () => {
    assert.equal(compare('A taxa de vacinação foi de 6,5%.', 'A taxa de vacinação registrada foi de 6,5%.'), 'supports')
    assert.equal(compare('A taxa de vacinação foi de 7%.', 'A taxa de vacinação registrada foi de 6,5%.'), 'contradicts')
  })

  it('não interfere quando os números pertencem a assuntos diferentes', () => {
    assert.equal(compare('O Senado possui 81 senadores.', 'A Constituição possui 250 artigos.'), undefined)
    assert.equal(compare('O mandato presidencial é de 4 anos.', 'A Constituição foi promulgada em 1988.'), undefined)
  })

  it('sobrescreve o stance da IA e registra proveniência somente quando a relação é clara', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'O salário mínimo em 2024 foi R$ 5.000.', role: 'primary' }]
    const sources: SourceDoc[] = [{
      id: 's1', title: 'Fonte oficial', url: 'https://dados.gov.br/salario', domain: 'dados.gov.br',
      tier: 'oficial', readStatus: 'read', accessedAt: '2026-10-13T00:00:00Z',
      text: 'O salário mínimo em vigor em 2024 foi R$ 1.412.',
    }]
    const raw: RawEvidence[] = [{
      claimId: 'c1', sourceId: 's1', quote: 'O salário mínimo em vigor em 2024 foi R$ 1.412.',
      context: 'Valor informado pela fonte.', stance: 'supports',
    }]
    const { valid } = validateEvidences(raw, claims, sources)
    assert.equal(valid[0].stance, 'contradicts')
    assert.equal(valid[0].stanceSource, 'deterministic')
  })

  it('descarta fonte confiável que menciona só o mesmo ano, sem o valor alegado', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'O investimento cultural em 2024 foi de R$ 50 milhões.', role: 'primary' }]
    const sources: SourceDoc[] = [{
      id: 's1', title: 'Portal oficial', url: 'https://gov.br/cultura', domain: 'gov.br',
      tier: 'oficial', readStatus: 'read', accessedAt: '2026-10-13T00:00:00Z',
      text: 'Em 2024, a secretaria realizou atividades culturais em diversos bairros.',
    }]
    const raw: RawEvidence[] = [{
      claimId: 'c1', sourceId: 's1', quote: 'Em 2024, a secretaria realizou atividades culturais em diversos bairros.',
      context: '', stance: 'supports',
    }]
    const { valid, discarded } = validateEvidences(raw, claims, sources)
    assert.equal(valid.length, 0)
    assert.equal(discarded, 1)
  })

  it('expõe motivo codificado para toda evidência rejeitada quando há observador', () => {
    const claims: Claim[] = [{ id: 'c1', text: 'O Senado possui 81 senadores.', role: 'primary' }]
    const rejected: string[] = []
    validateEvidences([{ claimId: 'c1', sourceId: 's1', quote: 'Citação inexistente e suficientemente longa.', context: '', stance: 'supports' }], claims, [{
      id: 's1', title: 'Fonte', url: 'https://senado.leg.br/x', domain: 'senado.leg.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: 'Texto lido sem a citação proposta.',
    }], {
      candidate() {}, accepted() {}, rejected: (item) => rejected.push(item.reason),
    })
    assert.deepEqual(rejected, ['QUOTE_NOT_IN_SOURCE'])
  })

  it('rejeita contexto histórico para claim atual antes da comparação factual', () => {
    const claim: Claim = { id: 'c1', text: 'O STF possui 15 ministros.', role: 'primary' }
    const quote = 'No início da República, ele contava com 15 Ministros.'
    const source: SourceDoc = {
      id: 's1', title: 'História do STF', url: 'https://portal.stf.jus.br/historia', domain: 'stf.jus.br',
      tier: 'oficial', readStatus: 'read', accessedAt: '', text: quote,
    }
    const rejected: { reason: string; relevanceChecks?: Record<string, boolean | number | string> }[] = []
    const out = validateEvidences([{ claimId: 'c1', sourceId: 's1', quote, context: '', stance: 'supports' }], [claim], [source], {
      candidate() {}, accepted() {}, rejected: (item) => rejected.push(item),
    })
    assert.equal(out.valid.length, 0)
    assert.equal(rejected[0].reason, 'HISTORICAL_CONTEXT_MISMATCH')
    assert.equal(rejected[0].relevanceChecks?.claimTemporalMode, 'current')
    assert.equal(rejected[0].relevanceChecks?.evidenceTemporalMode, 'historical')
    assert.equal(rejected[0].relevanceChecks?.temporalApplicable, false)
  })

  it('não transforma valor histórico diferente em contradição de uma claim atual', () => {
    const claim: Claim = { id: 'c1', text: 'O STF possui 11 ministros.', role: 'primary' }
    const quote = 'Em 1891, o tribunal contava com 15 ministros.'
    const source: SourceDoc = { id: 's1', title: 'História', url: 'https://stf.jus.br/h', domain: 'stf.jus.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: quote }
    const out = validateEvidences([{ claimId: 'c1', sourceId: 's1', quote, context: '', stance: 'contradicts' }], [claim], [source])
    assert.equal(out.valid.length, 0)
  })

  it('permite comparação atual e períodos explícitos compatíveis', () => {
    const current: Claim = { id: 'c1', text: 'O STF possui 11 ministros.', role: 'primary' }
    const currentQuote = 'O Supremo Tribunal Federal atualmente é composto por 11 ministros.'
    const currentSource: SourceDoc = { id: 's1', title: 'Composição', url: 'https://stf.jus.br/c', domain: 'stf.jus.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: currentQuote }
    assert.equal(validateEvidences([{ claimId: 'c1', sourceId: 's1', quote: currentQuote, context: '', stance: 'supports' }], [current], [currentSource]).valid[0].stance, 'supports')

    const historical: Claim = { id: 'c2', text: 'O STF em 1891 possuía 15 ministros.', role: 'primary' }
    const historicalQuote = 'Em 1891, o STF contava com 15 ministros.'
    const historicalSource: SourceDoc = { id: 's2', title: 'História', url: 'https://stf.jus.br/h', domain: 'stf.jus.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: historicalQuote }
    assert.equal(validateEvidences([{ claimId: 'c2', sourceId: 's2', quote: historicalQuote, context: '', stance: 'supports' }], [historical], [historicalSource]).valid[0].stance, 'supports')

    const salary: Claim = { id: 'c3', text: 'O salário mínimo em 2024 foi R$ 5.000.', role: 'primary', context: { temporal: { year: 2024, source: 'explicit-claim' } } }
    const salaryQuote = 'Em 2024, o salário mínimo foi de R$ 1.412.'
    const salarySource: SourceDoc = { id: 's3', title: 'Lei', url: 'https://planalto.gov.br/lei', domain: 'planalto.gov.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: salaryQuote }
    assert.equal(validateEvidences([{ claimId: 'c3', sourceId: 's3', quote: salaryQuote, context: '', stance: 'supports' }], [salary], [salarySource]).valid[0].stance, 'contradicts')
  })

  it('rejeita períodos explícitos incompatíveis e preserva trecho atual em janela mista', () => {
    const salary: Claim = { id: 'c1', text: 'O valor horário em 2024 foi R$ 6,42.', role: 'primary', context: { temporal: { year: 2024, source: 'explicit-claim' } } }
    const futureQuote = 'Em 2026, o valor horário será de R$ 7,37.'
    const futureSource: SourceDoc = { id: 's1', title: 'Valor futuro', url: 'https://gov.br/futuro', domain: 'gov.br', tier: 'oficial', readStatus: 'read', accessedAt: '', text: futureQuote }
    assert.equal(validateEvidences([{ claimId: 'c1', sourceId: 's1', quote: futureQuote, context: '', stance: 'contradicts' }], [salary], [futureSource]).valid.length, 0)

    const claim: Claim = { id: 'c2', text: 'O STF possui 11 ministros.', role: 'primary' }
    const mixedQuote = 'O STF, criado com 15 membros em 1891, atualmente é composto por 11 ministros.'
    const mixedSource: SourceDoc = { id: 's2', title: 'STF', url: 'https://stf.jus.br/atual', domain: 'stf.jus.br', tier: 'oficial', readStatus: 'read', accessedAt: '', publishedAt: '1891-01-01', text: mixedQuote }
    assert.equal(temporalApplicability(claim, mixedQuote, mixedSource.text).applicable, true)
    assert.equal(validateEvidences([{ claimId: 'c2', sourceId: 's2', quote: mixedQuote, context: '', stance: 'supports' }], [claim], [mixedSource]).valid[0].stance, 'supports')
  })
})
