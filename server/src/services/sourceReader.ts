import { extractPage } from '../lib/html'
import { performance } from 'node:perf_hooks'
import { fetchText, type FetchedText } from '../lib/safeFetch'
import type { Candidate } from '../lib/sourceRanking'
import { domainOf, tierOf } from '../lib/sourceRanking'
import type { SourceDoc } from '../types'

export type PageFetcher = (url: string) => Promise<FetchedText>
export interface FetchTrace { sourceId: string; url: string; domain: string; durationMs: number; readStatus: SourceDoc['readStatus']; bytes?: number; failureReason?: string }

export const defaultFetcher: PageFetcher = (url) => fetchText(url, { timeoutMs: 5000, maxBytes: 800_000, maxRedirects: 3 })

const MIN_READABLE_CHARS = 200

export interface AnalyzedPage {
  url: string
  finalUrl: string
  domain: string
  title?: string
  publishedDate?: string
  author?: string
  text: string
}

/** Lê o conteúdo enviado pelo cidadão pelo mesmo PageFetcher/safeFetch das fontes externas. */
export async function readAnalyzedPage(url: string, fetcher: PageFetcher = defaultFetcher): Promise<AnalyzedPage> {
  const page = await fetcher(url)
  if (!page.contentType.includes('text/html')) throw new Error('UNSUPPORTED_CONTENT_TYPE')
  const extracted = extractPage(page.body)
  if (extracted.text.length < MIN_READABLE_CHARS) throw new Error('INSUFFICIENT_CONTENT')
  return {
    url,
    finalUrl: page.finalUrl,
    domain: domainOf(page.finalUrl),
    title: extracted.title || undefined,
    publishedDate: extracted.publishedAt,
    author: extracted.author,
    text: extracted.text,
  }
}

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
  onTrace?: (trace: FetchTrace) => void,
): Promise<SourceDoc[]> {
  const settled = await Promise.allSettled(candidates.map(async (c) => {
    const started = performance.now()
    try { return { page: await fetcher(c.url), durationMs: Math.round(performance.now() - started) } }
    catch (error) { throw { error, durationMs: Math.round(performance.now() - started) } }
  }))
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
      const page = extractPage(result.value.page.body)
      if (page.text.length >= MIN_READABLE_CHARS) {
        const finalDomain = domainOf(result.value.page.finalUrl) || c.domain
        const doc = {
          ...base,
          title: page.title || c.title,
          url: result.value.page.finalUrl,
          domain: finalDomain,
          tier: tierOf(finalDomain),
          readStatus: 'read',
          text: page.text,
          publishedAt: page.publishedAt,
        } as SourceDoc
        onTrace?.({ sourceId: base.id, url: c.url, domain: c.domain, durationMs: result.value.durationMs, readStatus: 'read', bytes: Buffer.byteLength(result.value.page.body) })
        return doc
      }
    }
    const durationMs = result.status === 'fulfilled' ? result.value.durationMs : result.reason?.durationMs ?? 0
    const message = result.status === 'rejected' ? String(result.reason?.error?.message ?? result.reason?.error ?? 'OTHER') : 'EMPTY_CONTENT'
    const failureReason = /HTTP 403/.test(message) ? 'HTTP_403' : /HTTP 404/.test(message) ? 'HTTP_404' : /timeout/i.test(message) ? 'TIMEOUT' : /tipo de conteúdo/i.test(message) ? 'UNSUPPORTED_CONTENT_TYPE' : message
    const readStatus = c.snippet ? 'snippet-only' : 'unavailable'
    onTrace?.({ sourceId: base.id, url: c.url, domain: c.domain, durationMs, readStatus, failureReason })
    return { ...base, readStatus }
  })
}
