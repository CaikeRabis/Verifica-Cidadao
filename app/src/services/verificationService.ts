import { mockResults } from '../data/mockResults'
import { classificationOrder } from '../data/classifications'
import type { Classification, VerificationResult } from '../types'

/**
 * Camada de serviço da verificação.
 *
 * Integra com o backend real em POST /api/verify.
 * Se VITE_USE_MOCK_VERIFICATION='true' ou se a consulta contiver tags de teste
 * (como as disparadas pelos botões de simulação do painel demonstrativo),
 * executa o mock local preservando todos os cenários prévios de demonstração.
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

async function mockVerification(
  query: string,
  demo: Classification | 'erro' | 'fonte-indisponivel' | 'formato-invalido' | null,
): Promise<VerificationResult> {
  await wait(1200 + Math.random() * 600)

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

export async function verifyInformation(
  query: string,
  forced?: Classification,
): Promise<VerificationResult> {
  const demo = forced ?? detectDemoState(query)
  const useMock = import.meta.env.VITE_USE_MOCK_VERIFICATION === 'true'

  // Se o usuário clicou nos botões de simulação da barra de demonstração ou ativou a flag VITE_USE_MOCK_VERIFICATION
  if (demo !== null || useMock) {
    return mockVerification(query, demo)
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  let response: Response
  try {
    response = await fetch(`${apiBase}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query }),
    })
  } catch {
    throw new VerificationError(
      'Não foi possível conectar ao servidor de verificação. Verifique se o backend está em execução na porta 8787.',
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const code = data?.error?.code
    const message = data?.error?.message || 'Falha ao processar a verificação.'

    if (response.status === 422 || code === 'unsupported_format') {
      throw new UnsupportedFormatError(message)
    }
    if (response.status === 503 || code === 'source_unavailable') {
      throw new SourceUnavailableError()
    }
    throw new VerificationError(message)
  }

  return data as VerificationResult
}
