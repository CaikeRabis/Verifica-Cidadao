const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  agrave: 'à', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ',
  ccedil: 'ç', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç',
  ndash: '–', mdash: '—', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' '
    }
    return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m
  })
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

const MAX_TEXT = 12000

function meta(html: string, key: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${key}["']`, 'i')
  return html.match(re1)?.[1] ?? html.match(re2)?.[1]
}

function toIsoDate(v?: string): string | undefined {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined
}

export interface ExtractedPage {
  title: string
  text: string
  publishedAt?: string
}

/** Extração simples (sem DOM): título, texto principal e data de publicação quando óbvia. */
export function extractPage(html: string): ExtractedPage {
  const title = stripTags(
    meta(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '',
  ).slice(0, 200)

  const publishedAt = toIsoDate(
    meta(html, 'article:published_time') ??
      meta(html, 'datePublished') ??
      meta(html, 'date') ??
      html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1],
  )

  let body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|form|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ')

  const pick =
    body.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? body.match(/<main\b[\s\S]*?<\/main>/i)?.[0]
  if (pick && stripTags(pick).length > 400) body = pick

  const text = decodeEntities(
    body
      .replace(/<\/(p|div|li|h[1-6]|tr|br|section|blockquote)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, MAX_TEXT)

  return { title, text, publishedAt }
}
