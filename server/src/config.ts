export interface Config {
  port: number
  frontendOrigin: string
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiTimeoutMs: number
  searchProvider: 'brave' | 'duckduckgo'
  braveApiKey: string
  rateLimitMax: number
  rateLimitWindowMs: number
}

const int = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: int(env.PORT, 8787),
    frontendOrigin: env.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173',
    aiBaseUrl: (env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, ''),
    aiApiKey: env.AI_API_KEY?.trim() || '',
    aiModel: env.AI_MODEL?.trim() || 'gpt-4o-mini',
    aiTimeoutMs: int(env.AI_TIMEOUT_MS, 30000),
    searchProvider: env.SEARCH_PROVIDER?.trim() === 'brave' ? 'brave' : 'duckduckgo',
    braveApiKey: env.BRAVE_API_KEY?.trim() || '',
    rateLimitMax: int(env.RATE_LIMIT_MAX, 10),
    rateLimitWindowMs: int(env.RATE_LIMIT_WINDOW_MS, 600000),
  }
}
