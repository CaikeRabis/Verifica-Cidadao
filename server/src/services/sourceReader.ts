import { extractPage } from '../lib/html'
import { fetchText, type FetchedText } from '../lib/safeFetch'
import type { Candidate } from '../lib/sourceRanking'
import { domainOf, tierOf } from '../lib/sourceRanking'
import type { SourceDoc } from '../types'

export type PageFetcher = (url: string) => Promise<FetchedText>

export const defaultFetcher: PageFetcher = (url) => fetchText(url, { timeoutMs: 5000, maxBytes: 800_000, maxRedirects: 3 })

const MIN_READABLE_CHARS = 200

/**
 * Abre cada fonte selecionada. Só recebe `readStatus: 'read'` quem teve a página
 * efetivamente baixada e com texto suficiente. Falhou → 'snippet-only' (há só o
 * trecho do buscador, NUNCA usado como evidência) ou 'unavailable'.
 */
export async function readSources(
  candidates: Candidate[],
  fetcher: PageFetcher = defaultFetcher,
  now: () => Date = () => new Date(),
  startIndex = 0,
): Promise<SourceDoc[]> {
  const settled = await Promise.allSettled(candidates.map((c) => fetcher(c.url)))
  return candidates.map((c, i): SourceDoc => {
    const base = {
      id: `s${startIndex + i + 1}`,
      title: c.title,
      url: c.url,
      domain: c.domain,
      tier: c.tier,
      accessedAt: now().toISOString(),
      snippet: c.snippet || undefined,
    }
    const result = settled[i]
    if (result.status === 'fulfilled') {
      const page = extractPage(result.value.body)
      if (page.text.length >= MIN_READABLE_CHARS) {
        const finalDomain = domainOf(result.value.finalUrl) || c.domain
        return {
          ...base,
          title: page.title || c.title,
          url: result.value.finalUrl,
          domain: finalDomain,
          tier: tierOf(finalDomain),
          readStatus: 'read',
          text: page.text,
          publishedAt: page.publishedAt,
        }
      }
    }
    return { ...base, readStatus: c.snippet ? 'snippet-only' : 'unavailable' }
  })
}
