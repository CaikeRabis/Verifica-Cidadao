import type { Config } from '../config'
import { SearchUnavailableError, type SearchFailureReason } from '../errors'
import { decodeEntities, stripTags } from '../lib/html'
import { fetchText } from '../lib/safeFetch'
import { domainOf } from '../lib/sourceRanking'
import type { SearchResult } from '../types'
import { performance } from 'node:perf_hooks'

export interface SearchProvider {
  search(query: string, limit: number, options?: { timeoutMs?: number; canFallback?: () => boolean }): Promise<SearchResult[]>
  /** Consome tentativas da última busca; usado somente na telemetria interna. */
  takeAttempts?(): SearchAttempt[]
}

export interface SearchAttempt {
  provider: 'duckduckgo' | 'brave'
  success: boolean
  failureReason?: SearchFailureReason
  resultCount: number
  fallbackTriggered: boolean
  fallbackProvider?: 'brave'
  fallbackResultCount?: number
  fallbackSkippedReason?: 'TIME_BUDGET_EXHAUSTED'
  durationMs?: number
}

const http2xx = (url: string) => /^https?:\/\//i.test(url)

const searchCache = new Map<string, SearchResult[]>()

/** Brave Search API — opção recomendada para produção e apresentação oficial (exige BRAVE_API_KEY). */
export class BraveSearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit: number, options: { timeoutMs?: number } = {}): Promise<SearchResult[]> {
    if (!this.apiKey) throw new SearchUnavailableError('BRAVE_API_KEY ausente')
    const cacheKey = `brave:${query}:${limit}`
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&country=BR&search_lang=pt-br`
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
        signal: AbortSignal.timeout(Math.min(8000, options.timeoutMs ?? 8000)),
      })
    } catch {
      throw new SearchUnavailableError('falha de rede na busca', 'NETWORK_FAILURE')
    }
    if (!res.ok) throw new SearchUnavailableError(`busca respondeu ${res.status}`, 'INVALID_PROVIDER_RESPONSE')
    let json: { web?: { results?: { title?: string; url?: string; description?: string }[] } }
    try {
      json = await res.json() as typeof json
    } catch {
      throw new SearchUnavailableError('resposta inválida da busca', 'INVALID_PROVIDER_RESPONSE')
    }
    const results = (json.web?.results ?? [])
      .filter((r) => r.url && http2xx(r.url))
      .map((r) => ({
        title: stripTags(r.title ?? '') || domainOf(r.url!),
        url: r.url!,
        domain: domainOf(r.url!),
        snippet: stripTags(r.description ?? '').slice(0, 300), provider: 'brave' as const,
      }))
    searchCache.set(cacheKey, results)
    return results
  }
}

/**
 * DuckDuckGo (HTML) — provider primário. Falhas operacionais são propagadas
 * para o adaptador central, que pode acionar Brave de modo auditável.
 */
export class DuckDuckGoDemoProvider implements SearchProvider {
  async search(query: string, limit: number, options: { timeoutMs?: number } = {}): Promise<SearchResult[]> {
    const cacheKey = `ddg:${query}:${limit}`
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

    let html = ''
    try {
      html = (
        await fetchText(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`, {
          timeoutMs: Math.min(8000, options.timeoutMs ?? 8000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
            'Sec-Ch-Ua': '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
        })
      ).body
    } catch {
      throw new SearchUnavailableError('falha ao consultar a busca', 'NETWORK_FAILURE')
    }

    // A página sem a marca estrutural esperada é desafio anti-bot ou resposta inválida.
    if (!/result__a/.test(html)) {
      throw new SearchUnavailableError('busca sem resultados legíveis (possível bloqueio temporário)', 'ANTI_BOT_CHALLENGE')
    }

    const out: SearchResult[] = []
    const blocks = html.match(/<div class="[^"]*result[^"]*results_links[\s\S]*?<\/div>\s*<\/div>/gi) ?? html.split(/class="result__a"/).slice(1)
    for (const block of blocks) {
      const link = block.match(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ?? block.match(/^[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      if (!link) continue
      let url = decodeEntities(link[1])
      try {
        const parsed = new URL(url, 'https://duckduckgo.com')
        const target = parsed.searchParams.get('uddg')
        url = target ? decodeURIComponent(target) : parsed.toString()
      } catch {
        continue
      }
      if (!http2xx(url)) continue
      const snippet = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i)?.[1] ?? ''
      out.push({ title: stripTags(link[2]).slice(0, 200) || domainOf(url), url, domain: domainOf(url), snippet: stripTags(snippet).slice(0, 300), provider: 'duckduckgo' })
      if (out.length >= limit) break
    }

    // HTML com resultados, mas sem links utilizáveis, é falha de parsing.
    if (out.length === 0) {
      throw new SearchUnavailableError('falha ao interpretar os resultados da busca', 'RESULT_PARSING_FAILURE')
    }

    searchCache.set(cacheKey, out)
    return out
  }
}

/**
 * Cadeia operacional explícita: DDG é primário; Brave só é chamado após uma
 * falha técnica dele. Uma busca válida sem evidência nunca chega a este ponto.
 */
export class ControlledFallbackSearchProvider implements SearchProvider {
  private attempts: SearchAttempt[] = []

  constructor(
    private primary: SearchProvider,
    private fallback: SearchProvider,
  ) {}

  takeAttempts() {
    const attempts = this.attempts
    this.attempts = []
    return attempts
  }

  async search(query: string, limit: number, options: { timeoutMs?: number; canFallback?: () => boolean } = {}): Promise<SearchResult[]> {
    const started = performance.now()
    try {
      const results = await this.primary.search(query, limit, options)
      this.attempts.push({ provider: 'duckduckgo', success: true, resultCount: results.length, fallbackTriggered: false, durationMs: Math.round(performance.now() - started) })
      return results
    } catch (error) {
      // Apenas falhas explicitamente classificadas pelo provider podem consumir
      // uma consulta Brave; bugs inesperados não devem ser mascarados como busca.
      if (!(error instanceof SearchUnavailableError)) throw error
      const failureReason = error.reason
      if (options.canFallback && !options.canFallback()) {
        this.attempts.push({ provider: 'duckduckgo', success: false, failureReason, resultCount: 0, fallbackTriggered: false, fallbackSkippedReason: 'TIME_BUDGET_EXHAUSTED', durationMs: Math.round(performance.now() - started) })
        throw error
      }
      const fallbackStarted = performance.now()
      try {
        const results = await this.fallback.search(query, limit, options)
        this.attempts.push({
          provider: 'duckduckgo', success: false, failureReason, resultCount: 0,
          fallbackTriggered: true, fallbackProvider: 'brave', fallbackResultCount: results.length, durationMs: Math.round(fallbackStarted - started),
        })
        this.attempts.push({ provider: 'brave', success: true, resultCount: results.length, fallbackTriggered: true, fallbackProvider: 'brave', fallbackResultCount: results.length, durationMs: Math.round(performance.now() - fallbackStarted) })
        return results
      } catch (fallbackError) {
        const fallbackReason = fallbackError instanceof SearchUnavailableError ? fallbackError.reason : 'SEARCH_PROVIDER_UNAVAILABLE'
        this.attempts.push({ provider: 'duckduckgo', success: false, failureReason, resultCount: 0, fallbackTriggered: true, fallbackProvider: 'brave', fallbackResultCount: 0 })
        this.attempts.push({ provider: 'brave', success: false, failureReason: fallbackReason, resultCount: 0, fallbackTriggered: true, fallbackProvider: 'brave', fallbackResultCount: 0 })
        throw new SearchUnavailableError('busca indisponível', fallbackReason)
      }
    }
  }
}

export function createSearchProvider(config: Config): SearchProvider {
  if (config.searchProvider === 'brave') return new BraveSearchProvider(config.braveApiKey)
  return new ControlledFallbackSearchProvider(
    new DuckDuckGoDemoProvider(),
    new BraveSearchProvider(config.braveApiKey),
  )
}
