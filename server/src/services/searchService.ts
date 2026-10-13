import type { Config } from '../config'
import { SearchUnavailableError } from '../errors'
import { decodeEntities, stripTags } from '../lib/html'
import { fetchText } from '../lib/safeFetch'
import { domainOf } from '../lib/sourceRanking'
import type { SearchResult } from '../types'

export interface SearchProvider {
  search(query: string, limit: number): Promise<SearchResult[]>
}

const http2xx = (url: string) => /^https?:\/\//i.test(url)

/** Brave Search API — opção recomendada (exige BRAVE_API_KEY). */
export class BraveSearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    if (!this.apiKey) throw new SearchUnavailableError('BRAVE_API_KEY ausente')
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&country=BR&search_lang=pt`
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      throw new SearchUnavailableError('falha de rede na busca')
    }
    if (!res.ok) throw new SearchUnavailableError(`busca respondeu ${res.status}`)
    const json = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } }
    return (json.web?.results ?? [])
      .filter((r) => r.url && http2xx(r.url))
      .map((r) => ({
        title: stripTags(r.title ?? '') || domainOf(r.url!),
        url: r.url!,
        domain: domainOf(r.url!),
        snippet: stripTags(r.description ?? '').slice(0, 300),
      }))
  }
}

/**
 * DuckDuckGo (HTML) — APENAS PARA DEMONSTRAÇÃO. Faz scraping do HTML público,
 * sem contrato nem garantia de estabilidade. Em produção, use um provedor com API.
 */
export class DuckDuckGoDemoProvider implements SearchProvider {
  async search(query: string, limit: number): Promise<SearchResult[]> {
    let html: string
    try {
      html = (await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`, { timeoutMs: 8000 })).body
    } catch {
      throw new SearchUnavailableError('falha ao consultar a busca')
    }
    if (!/result__a/.test(html)) throw new SearchUnavailableError('busca sem resultados legíveis (possível bloqueio)')
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
      out.push({ title: stripTags(link[2]).slice(0, 200) || domainOf(url), url, domain: domainOf(url), snippet: stripTags(snippet).slice(0, 300) })
      if (out.length >= limit) break
    }
    return out
  }
}

export function createSearchProvider(config: Config): SearchProvider {
  return config.searchProvider === 'brave'
    ? new BraveSearchProvider(config.braveApiKey)
    : new DuckDuckGoDemoProvider()
}
