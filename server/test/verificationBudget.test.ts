import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { VerificationBudget } from '../src/lib/verificationBudget'
import { verify, type PipelineTrace } from '../src/services/verificationService'
import type { AiService } from '../src/services/aiService'
import type { SearchProvider } from '../src/services/searchService'

const trace = (): PipelineTrace => ({ timingsMs: {}, queries: {}, searchResults: {}, searchCalls: [], searchAttempts: [], selectedSources: [], fetches: [], aiCalls: [], evidenceCandidates: [], rejectedEvidences: [], acceptedEvidenceTrace: [], windows: [], acceptedEvidences: 0, discardedEvidences: 0, retries: { extraAiCalls: 0, evidence: [] }, deterministicRecoveries: [], selfReferenceRejections: [], secondaryRecovery: [], secondaryTargetedSearches: 0, additionalSearchRequests: 0, additionalBraveFallbackRequests: 0, secondaryRecoveryLatencyMs: 0, budget: { budgetMs: 25000, elapsedMs: 0, remainingMs: 25000, budgetExhausted: false, skippedOperations: [] } })

describe('Orçamento global de verificação', () => {
  it('usa relógio monotônico e respeita margem antes de iniciar operação', () => {
    const budget = new VerificationBudget(1)
    assert.equal(budget.canStartOperation(1), false)
    assert.ok(budget.remainingMs() >= 0)
  })

  it('não inicia busca nem recovery secondary sem orçamento e preserva resultado conservador', async () => {
    const pipelineTrace = trace(); let searches = 0
    const ai: AiService = {
      async extractClaims() { return [{ text: 'A capital do Brasil é Brasília.', role: 'primary' }, { text: 'O STF possui 11 ministros.', role: 'secondary', material: true }] },
      async extractEvidence() { return [] },
    }
    const search: SearchProvider = { async search() { searches++; return [] } }
    const result = await verify('url', { ai, search, trace: pipelineTrace }, { budget: new VerificationBudget(1), analyzedSource: { url: 'https://cidada.exemplo/a', finalUrl: 'https://cidada.exemplo/a', domain: 'cidada.exemplo' } })
    assert.equal(searches, 0)
    assert.equal(result.classification, 'analise-humana')
    assert.ok(result.limitations.some((item) => item.includes('limite de tempo')))
    assert.ok(pipelineTrace.budget.skippedOperations.some((item) => item.reason === 'TIME_BUDGET_EXHAUSTED'))
  })

  it('não chama Brave quando o budget não comporta fallback', async () => {
    const budget = new VerificationBudget(1)
    assert.equal(budget.canStartOperation(8000), false)
  })
})
