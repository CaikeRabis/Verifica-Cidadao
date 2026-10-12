import { mockResults } from '../data/mockResults'
import { classificationOrder } from '../data/classifications'
import type { Classification, VerificationResult } from '../types'

/**
 * Camada de serviço da verificação.
 *
 * ⚠️ MOCK: nesta fase nenhuma IA ou API é chamada. Para integrar o backend,
 * basta substituir o corpo de `verifyInformation` por uma chamada HTTP que
 * retorne um `VerificationResult` — o restante da interface não muda.
 */

export class VerificationError extends Error {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const detectDemoState = (query: string): Classification | 'erro' | null => {
  const q = query.toLowerCase()
  if (q.includes('simular erro') || q.includes('#erro')) return 'erro'
  const tagged = classificationOrder.find((c) => q.includes(`#${c}`))
  return tagged ?? null
}

let counter = 0

export async function verifyInformation(
  query: string,
  forced?: Classification,
): Promise<VerificationResult> {
  await wait(1800 + Math.random() * 800)

  const demo = forced ?? detectDemoState(query)
  if (demo === 'erro') {
    throw new VerificationError('Não foi possível concluir a verificação agora.')
  }

  const classification: Classification =
    demo ?? classificationOrder[counter++ % classificationOrder.length]

  return {
    id: `mock-${Date.now()}-${counter}`,
    query,
    analyzedAt: new Date().toISOString(),
    ...mockResults[classification],
  }
}
