import { Router, type NextFunction, type Request, type Response } from 'express'
import { AiInvalidResponseError, AiUnavailableError, ApiError, SearchUnavailableError } from '../errors'
import { validatePublicUrl, UnsafeUrlError, FetchFailedError } from '../lib/safeFetch'
import { validateVerificationInput } from '../lib/input'
import { verify, type VerificationDeps } from '../services/verificationService'
import { readAnalyzedPage } from '../services/sourceReader'

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
  if (e instanceof UnsafeUrlError) return new ApiError(422, 'invalid_url', 'O link é inválido ou aponta para um endereço não permitido.')
  if (e instanceof FetchFailedError) {
    if (/tipo de conteúdo/i.test(e.message)) return new ApiError(422, 'unsupported_format', 'Este formato ainda não é suportado no modo Link.')
    if (/timeout/i.test(e.message)) return new ApiError(422, 'url_timeout', 'A página demorou demais para responder. Você pode copiar o texto principal e usar o modo Texto.')
    return new ApiError(422, 'url_unavailable', 'Não conseguimos ler automaticamente esta página. Você pode copiar o texto principal e usar o modo Texto.')
  }
  return new ApiError(500, 'internal_error', 'Não foi possível concluir a verificação agora.')
}

export function verifyRouter(deps: VerificationDeps): Router {
  const router = Router()
  router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now()
    try {
      const request = validateVerificationInput(req.body)
      let result
      if (request.inputType === 'url') {
        validatePublicUrl(request.input)
        let analyzed
        try {
          analyzed = await readAnalyzedPage(request.input, deps.fetcher)
        } catch (error) {
          if (error instanceof UnsafeUrlError || error instanceof FetchFailedError) throw error
          const reason = error instanceof Error ? error.message : ''
          if (reason === 'UNSUPPORTED_CONTENT_TYPE') throw new ApiError(422, 'unsupported_format', 'Este formato ainda não é suportado no modo Link.')
          if (reason === 'INSUFFICIENT_CONTENT') throw new ApiError(422, 'insufficient_content', 'Não foi possível extrair conteúdo suficiente desta página para realizar a verificação.')
          throw new ApiError(422, 'url_unavailable', 'Não conseguimos ler automaticamente esta página. Você pode copiar o texto principal e usar o modo Texto.')
        }
        result = await verify(request.input, deps, {
          claimInput: analyzed.text,
          analyzedSource: {
            url: analyzed.url,
            finalUrl: analyzed.finalUrl,
            domain: analyzed.domain,
            title: analyzed.title,
            publishedDate: analyzed.publishedDate,
          },
        })
      } else {
        result = await verify(request.input, deps)
      }
      // log estruturado SEM o texto do cidadão
      console.log(
        JSON.stringify({
          event: 'verify',
          inputType: request.inputType,
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
