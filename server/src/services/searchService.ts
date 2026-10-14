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

const searchCache = new Map<string, SearchResult[]>()

/** Brave Search API — opção recomendada para produção e apresentação oficial (exige BRAVE_API_KEY). */
export class BraveSearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    if (!this.apiKey) throw new SearchUnavailableError('BRAVE_API_KEY ausente')
    const cacheKey = `brave:${query}:${limit}`
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&country=BR&search_lang=pt-br`
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

import { extractKeywords } from '../lib/queryGeneration'

/** Fallback resiliente via API oficial da Wikipédia em português (quando DuckDuckGo apresentar desafio anti-bot). */
async function searchWikipediaFallback(query: string, limit: number): Promise<SearchResult[]> {
  const tryWiki = async (term: string): Promise<SearchResult[]> => {
    try {
      const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&utf8=&format=json`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VerificaCidadao/0.1.1 (educativo/verificacao)' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const json = (await res.json()) as { query?: { search?: { title?: string; snippet?: string }[] } }
      const items = json?.query?.search ?? []
      return items.slice(0, limit).map((it) => {
        const title = it.title ?? 'Artigo enciclopédico'
        const pageUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
        return {
          title,
          url: pageUrl,
          domain: 'pt.wikipedia.org',
          snippet: stripTags(it.snippet ?? '').slice(0, 300), provider: 'wikipedia-fallback' as const,
        }
      })
    } catch {
      return []
    }
  }

  const cleanQ = query.replace(/site:\S+/g, '').trim()
  let results = await tryWiki(cleanQ)
  if (results.length === 0) {
    const kw = extractKeywords(cleanQ).slice(0, 4).join(' ')
    if (kw && kw !== cleanQ) {
      results = await tryWiki(kw)
    }
  }
  return results
}

/**
 * DuckDuckGo (HTML) — PARA DEMONSTRAÇÃO. Faz scraping do HTML público.
 * Se o DuckDuckGo retornar bloqueio por desafio de robô, ativa fallback resiliente para Wikipédia.
 */
export class DuckDuckGoDemoProvider implements SearchProvider {
  async search(query: string, limit: number): Promise<SearchResult[]> {
    const cacheKey = `ddg:${query}:${limit}`
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

    let html = ''
    try {
      html = (
        await fetchText(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`, {
          timeoutMs: 8000,
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
      // Falha de rede: tenta fallback da Wikipédia
      const fallback = await searchWikipediaFallback(query, limit)
      if (fallback.length > 0) {
        searchCache.set(cacheKey, fallback)
        return fallback
      }
      throw new SearchUnavailableError('falha ao consultar a busca')
    }

    // Se detectou desafio de robô ou falta de resultados
    if (!/result__a/.test(html)) {
      const fallback = await searchWikipediaFallback(query, limit)
      if (fallback.length > 0) {
        searchCache.set(cacheKey, fallback)
        return fallback
      }
      throw new SearchUnavailableError('busca sem resultados legíveis (possível bloqueio temporário)')
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

    // Se não extraiu links úteis, tenta o fallback
    if (out.length === 0) {
      const fallback = await searchWikipediaFallback(query, limit)
      if (fallback.length > 0) {
        searchCache.set(cacheKey, fallback)
        return fallback
      }
    }

    searchCache.set(cacheKey, out)
    return out
  }
}

export function createSearchProvider(config: Config): SearchProvider {
  return config.searchProvider === 'brave'
    ? new BraveSearchProvider(config.braveApiKey)
    : new DuckDuckGoDemoProvider()
}
