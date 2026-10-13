import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareFactualClaim, extractFactualEntities } from '../src/lib/factualComparison'
import { validateEvidences } from '../src/services/evidenceValidation'
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
})
