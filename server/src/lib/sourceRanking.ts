import type { SearchResult, SourceTier } from '../types'

const OFFICIAL_SUFFIXES = ['.gov.br', '.leg.br', '.jus.br', '.mp.br', '.def.br', '.mil.br']
const OFFICIAL_DOMAINS = ['who.int', 'paho.org', 'un.org', 'tcu.gov.br', 'ibge.gov.br']
const NEWS_DOMAINS = [
  'g1.globo.com', 'globo.com', 'oglobo.globo.com', 'folha.uol.com.br', 'uol.com.br', 'estadao.com.br',
  'agenciabrasil.ebc.com.br', 'ebc.com.br', 'reuters.com', 'bbc.com', 'cnnbrasil.com.br', 'poder360.com.br',
  'nexojornal.com.br', 'aosfatos.org', 'lupa.news', 'apublica.org', 'correiobraziliense.com.br',
  'metropoles.com', 'valor.globo.com', 'cartacapital.com.br', 'brasildefato.com.br', 'veja.abril.com.br',
  'agenciabrasil.com.br', 'senadonoticias.leg.br',
]

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

const matches = (domain: string, base: string) => domain === base || domain.endsWith(`.${base}`)

export function tierOf(domain: string): SourceTier {
  if (OFFICIAL_SUFFIXES.some((s) => domain.endsWith(s)) || OFFICIAL_DOMAINS.some((d) => matches(domain, d))) {
    return 'oficial'
  }
  if (NEWS_DOMAINS.some((d) => matches(domain, d))) return 'jornalismo'
  return 'outro'
}

export const TIER_WEIGHT: Record<SourceTier, number> = { oficial: 3, jornalismo: 2, outro: 1 }

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(k)) u.searchParams.delete(k)
    u.hostname = u.hostname.toLowerCase()
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

export interface Candidate extends SearchResult {
  tier: SourceTier
}

/** Ranking simples por claim: peso do domínio, sem URLs repetidas, preferindo domínios distintos. */
export function rankForClaim(results: SearchResult[], limit = 3): Candidate[] {
  const seen = new Set<string>()
  const unique: Candidate[] = []
  for (const r of results) {
    const key = normalizeUrl(r.url)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ ...r, domain: r.domain || domainOf(r.url), tier: tierOf(r.domain || domainOf(r.url)) })
  }
  const sorted = unique
    .map((c, i) => ({ c, i }))
    .sort((a, b) => TIER_WEIGHT[b.c.tier] - TIER_WEIGHT[a.c.tier] || a.i - b.i)
    .map((x) => x.c)

  const picked: Candidate[] = []
  const domains = new Set<string>()
  for (const c of sorted) {
    if (picked.length >= limit) break
    if (!domains.has(c.domain)) {
      picked.push(c)
      domains.add(c.domain)
    }
  }
  for (const c of sorted) {
    if (picked.length >= limit) break
    if (!picked.includes(c)) picked.push(c)
  }
  return picked
}

/**
 * Seleção global: até `perClaim` por claim e `maxTotal` no total
 * (intercalando as claims), no máximo 2 páginas por domínio.
 */
export function selectSources(perClaim: SearchResult[][], maxTotal = 5, perClaimLimit = 3): Candidate[] {
  const ranked = perClaim.map((r) => rankForClaim(r, perClaimLimit))
  const out: Candidate[] = []
  const seen = new Set<string>()
  const perDomain = new Map<string, number>()
  for (let round = 0; round < perClaimLimit && out.length < maxTotal; round++) {
    for (const list of ranked) {
      const c = list[round]
      if (!c || out.length >= maxTotal) continue
      const key = normalizeUrl(c.url)
      if (seen.has(key)) continue
      if ((perDomain.get(c.domain) ?? 0) >= 2) continue
      seen.add(key)
      perDomain.set(c.domain, (perDomain.get(c.domain) ?? 0) + 1)
      out.push(c)
    }
  }
  return out
}
