import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { guardText } from '../src/lib/languageSafety'
import { composeNarrative, isNarrativeConsistent } from '../src/lib/resultNarrative'
import { classify } from '../src/services/classification'
import type { Claim, SourceDoc, ValidEvidence } from '../src/types'

const claim: Claim = { id: 'c1', text: 'O salário mínimo em 2024 foi R$ 5.000.', role: 'primary' }
const source: SourceDoc = {
  id: 's1', title: 'Decreto do salário mínimo', url: 'https://planalto.gov.br/decreto', domain: 'planalto.gov.br',
  tier: 'oficial', readStatus: 'read', accessedAt: '2026-10-13T00:00:00Z',
  text: 'O salário mínimo em vigor em 2024 foi R$ 1.412.',
}
const contradicts: ValidEvidence = {
  id: 'e1', claimId: 'c1', sourceId: 's1', quote: 'O salário mínimo em vigor em 2024 foi R$ 1.412.',
  context: '', stance: 'contradicts', tier: 'oficial', stanceSource: 'deterministic',
}

describe('Narrativa final e robustez v0.2.2', () => {
  it('produz resumo contradito ligado à divergência e à fonte validada', () => {
    const narrative = composeNarrative({ classification: 'contradita', claims: [claim], sources: [source], evidences: [contradicts] })
    assert.match(narrative.summary, /diverge/i)
    assert.match(narrative.explanation, /R\$ 1\.412/)
    assert.match(narrative.explanation, /Decreto do salário mínimo/)
  })

  it('produz resumo confirmado coerente com evidência de suporte', () => {
    const supports = { ...contradicts, stance: 'supports' as const }
    const narrative = composeNarrative({ classification: 'confirmada', claims: [claim], sources: [source], evidences: [supports] })
    assert.match(narrative.summary, /respaldo/i)
    assert.match(narrative.explanation, /sustenta/i)
  })

  it('não inventa valores nem fontes ausentes na explicação', () => {
    const narrative = composeNarrative({ classification: 'contradita', claims: [claim], sources: [source], evidences: [contradicts] })
    assert.doesNotMatch(narrative.explanation, /11\.864/)
    assert.equal(isNarrativeConsistent(narrative, 'contradita', [source], contradicts), true)
    assert.equal(isNarrativeConsistent(narrative, 'contradita', [], contradicts), false)
    const formattedSource = { ...source, text: 'O salário mínimo em vigor em 2024 foi\nR$ 1.412.' }
    assert.equal(isNarrativeConsistent(narrative, 'contradita', [formattedSource], contradicts), true)
  })

  it('atribui robustez alta com principal coberta por fonte oficial lida e clara', () => {
    const out = classify({ claims: [claim], evidences: [contradicts], sources: [source] })
    assert.equal(out.confidence, 'alta')
  })

  it('atribui robustez média para boa evidência sem fonte oficial', () => {
    const journalistic: SourceDoc = { ...source, id: 's2', domain: 'veiculo.exemplo.br', tier: 'jornalismo' }
    const evidence = { ...contradicts, sourceId: 's2', tier: 'jornalismo' as const }
    const out = classify({ claims: [claim], evidences: [evidence], sources: [journalistic] })
    assert.equal(out.confidence, 'media')
  })

  it('atribui robustez baixa quando a claim principal não tem cobertura', () => {
    const out = classify({ claims: [claim], evidences: [], sources: [source] })
    assert.equal(out.confidence, 'baixa')
  })

  it('não descreve snippet-only como fonte lida e mantém bloqueio de linguagem acusatória', () => {
    const unread: SourceDoc = { ...source, readStatus: 'snippet-only', title: 'Página não lida', text: undefined }
    const narrative = composeNarrative({ classification: 'analise-humana', claims: [claim], sources: [unread], evidences: [] })
    assert.doesNotMatch(narrative.explanation, /Página não lida/)
    assert.equal(guardText('A empresa cometeu fraude.').replaced, true)
  })
})
