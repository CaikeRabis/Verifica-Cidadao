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

export class SourceUnavailableError extends Error {
  sourceName: string
  constructor(sourceName = 'Portal da Transparência') {
    super(`A fonte ${sourceName} está temporariamente indisponível.`)
    this.sourceName = sourceName
  }
}

export class UnsupportedFormatError extends Error {
  constructor(message = 'Formato de conteúdo não suportado.') {
    super(message)
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const detectDemoState = (
  query: string,
): Classification | 'erro' | 'fonte-indisponivel' | 'formato-invalido' | null => {
  const q = query.toLowerCase()
  if (q.includes('simular erro') || q.includes('#erro')) return 'erro'
  if (q.includes('fonte indisponível') || q.includes('#fonte-indisponivel')) return 'fonte-indisponivel'
  if (q.includes('formato não suportado') || q.includes('#formato-invalido')) return 'formato-invalido'
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
  if (demo === 'fonte-indisponivel') {
    throw new SourceUnavailableError('Portal da Transparência Federal')
  }
  if (demo === 'formato-invalido') {
    throw new UnsupportedFormatError('Formato de mídia não suportado nesta fase.')
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
