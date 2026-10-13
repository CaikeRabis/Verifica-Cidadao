import { Router, type NextFunction, type Request, type Response } from 'express'
import { AiInvalidResponseError, AiUnavailableError, ApiError, SearchUnavailableError } from '../errors'
import { validateInput } from '../lib/input'
import { verify, type VerificationDeps } from '../services/verificationService'

/** Converte erros internos em respostas amigáveis (sem stack trace). */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof SearchUnavailableError) {
    return new ApiError(503, 'source_unavailable', 'O serviço de busca de fontes está temporariamente indisponível. Tente novamente em instantes.')
  }
  if (e instanceof AiUnavailableError) {
    return new ApiError(503, 'ai_unavailable', 'O serviço de análise está temporariamente indisponível. Tente novamente em instantes.')
  }
  if (e instanceof AiInvalidResponseError) {
    return new ApiError(502, 'ai_invalid_response', 'Não foi possível interpretar a resposta da análise. Tente novamente.')
  }
  return new ApiError(500, 'internal_error', 'Não foi possível concluir a verificação agora.')
}

export function verifyRouter(deps: VerificationDeps): Router {
  const router = Router()
  router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now()
    try {
      const input = validateInput(req.body)
      const result = await verify(input, deps)
      // log estruturado SEM o texto do cidadão
      console.log(
        JSON.stringify({
          event: 'verify',
          requestId: result.requestId,
          classification: result.classification,
          claims: result.claims.length,
          sourcesRead: result.sources.filter((s) => s.readStatus === 'read').length,
          evidences: result.evidences.length,
          ms: Date.now() - started,
        }),
      )
      res.json(result)
    } catch (e) {
      next(e)
    }
  })
  return router
}
