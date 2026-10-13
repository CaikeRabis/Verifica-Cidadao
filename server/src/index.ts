import express, { type NextFunction, type Request, type Response } from 'express'
import { pathToFileURL } from 'node:url'
import { loadConfig, type Config } from './config'
import { ApiError } from './errors'
import { toApiError, verifyRouter } from './routes/verify'
import { OpenAiCompatibleService, type AiService } from './services/aiService'
import { createSearchProvider, type SearchProvider } from './services/searchService'
import { PIPELINE_VERSION } from './version'

function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      return next(new ApiError(429, 'rate_limited', 'Muitas verificações em pouco tempo. Aguarde alguns minutos e tente novamente.'))
    }
    recent.push(now)
    hits.set(key, recent)
    next()
  }
}

export function createApp(config: Config, overrides: { ai?: AiService; search?: SearchProvider } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-store')
    const origin = req.headers.origin
    if (origin && origin === config.frontendOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS') return void res.sendStatus(204)
    next()
  })

  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', pipelineVersion: PIPELINE_VERSION }))

  app.use(
    '/api',
    rateLimiter(config.rateLimitMax, config.rateLimitWindowMs),
    verifyRouter({
      ai: overrides.ai ?? new OpenAiCompatibleService(config),
      search: overrides.search ?? createSearchProvider(config),
    }),
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const syntax = err instanceof SyntaxError || (err as { type?: string })?.type === 'entity.too.large'
    const api = syntax
      ? new ApiError(400, 'invalid_input', 'Requisição inválida ou grande demais.')
      : toApiError(err)
    if (api.status >= 500) {
      console.error(JSON.stringify({ event: 'error', code: api.code, detail: err instanceof Error ? err.message : 'unknown' }))
    }
    res.status(api.status).json({ error: { code: api.code, message: api.message } })
  })

  return app
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.loadEnvFile('.env')
  } catch {
    /* sem .env: usa variáveis do ambiente */
  }
  const config = loadConfig()
  if (!config.aiApiKey) console.warn('[aviso] AI_API_KEY não configurada: /api/verify responderá 503 até configurar.')
  if (config.searchProvider === 'duckduckgo') console.warn('[aviso] SEARCH_PROVIDER=duckduckgo é apenas para demonstração.')
  createApp(config).listen(config.port, () => console.log(`Verifica Cidadão API v0.1 em http://localhost:${config.port}`))
}
