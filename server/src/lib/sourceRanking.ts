import type { SearchResult, SourceTier } from '../types'
import { extractKeywords } from './queryGeneration'

const OFFICIAL_SUFFIXES = ['.gov.br', '.leg.br', '.jus.br', '.mp.br', '.def.br', '.mil.br']
const PRIORITY_OFFICIAL_DOMAINS = [
  'planalto.gov.br', 'senado.leg.br', 'camara.leg.br', 'stf.jus.br',
  'tse.jus.br', 'tcu.gov.br', 'ibge.gov.br', 'gov.br', 'saude.gov.br',
]
const OFFICIAL_DOMAINS = [
  ...PRIORITY_OFFICIAL_DOMAINS,
  'who.int', 'paho.org', 'un.org', 'inep.gov.br', 'capes.gov.br', 'ipea.gov.br',
]

const NEWS_DOMAINS = [
  'g1.globo.com', 'globo.com', 'oglobo.globo.com', 'folha.uol.com.br', 'uol.com.br', 'estadao.com.br',
  'agenciabrasil.ebc.com.br', 'ebc.com.br', 'reuters.com', 'bbc.com', 'cnnbrasil.com.br', 'poder360.com.br',
  'nexojornal.com.br', 'aosfatos.org', 'lupa.news', 'apublica.org', 'correiobraziliense.com.br',
  'metropoles.com', 'valor.globo.com', 'cartacapital.com.br', 'brasildefato.com.br', 'veja.abril.com.br',
  'agenciabrasil.com.br', 'senadonoticias.leg.br', 'noticias.uol.com.br', 'noticias.r7.com', 'r7.com',
  'exame.com', 'jota.info', 'congressoemfoco.com.br', 'gazetadopovo.com.br', 'infomoney.com.br',
  'wikipedia.org', 'pt.wikipedia.org', 'brasilescola.uol.com.br', 'todamateria.com.br', 'mundoeducacao.uol.com.br',
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
  if (domain.endsWith('.edu.br') || NEWS_DOMAINS.some((d) => matches(domain, d))) return 'jornalismo'
  return 'outro'
}

export const TIER_WEIGHT: Record<SourceTier, number> = { oficial: 4, jornalismo: 3, outro: 1 }

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
  score?: number
}

function lexicalScore(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0
  const normText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  let matchesCount = 0
  for (const kw of keywords) {
    if (normText.includes(kw)) matchesCount++
  }
  return matchesCount
}

export function baseDomainOf(domain: string): string {
  const parts = domain.toLowerCase().split('.')
  if (
    parts.length >= 3 &&
    ['gov', 'leg', 'jus', 'mp', 'def', 'mil', 'edu', 'org', 'com'].includes(parts[parts.length - 2]) &&
    parts[parts.length - 1] === 'br'
  ) {
    return parts.slice(-3).join('.')
  }
  return parts.slice(-2).join('.')
}

/** Ranking refinado por claim: peso do domínio, overlap de palavras-chave no título e snippet, preferindo fontes oficiais e diversidade. */
export function rankForClaim(results: SearchResult[], limit = 3, claimText?: string): Candidate[] {
  const keywords = claimText ? extractKeywords(claimText) : []
  const seen = new Set<string>()
  const candidates: Candidate[] = []

  for (const r of results) {
    const key = normalizeUrl(r.url)
    if (seen.has(key)) continue
    seen.add(key)

    const domain = r.domain || domainOf(r.url)
    const tier = tierOf(domain)
    let score = TIER_WEIGHT[tier] * 10

    // Bônus especial para órgãos públicos federais prioritários
    if (PRIORITY_OFFICIAL_DOMAINS.some((d) => matches(domain, d))) {
      score += 5
    }

    // Bônus educacional / enciclopédico de referência para fatos gerais
    if (domain.endsWith('.edu.br') || domain.includes('wikipedia.org') || domain.includes('brasilescola')) {
      score += 3
    }

    // Overlap léxico no título (+3 por termo) e no snippet (+1 por termo)
    score += lexicalScore(r.title, keywords) * 3
    score += lexicalScore(r.snippet, keywords) * 1

    candidates.push({
      ...r,
      domain,
      tier,
      score,
    })
  }

  // Ordena por pontuação composta
  const sorted = candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const picked: Candidate[] = []
  const domains = new Set<string>()
  const baseDomains = new Set<string>()

  // 1ª passagem: Garante pelo menos 1 fonte oficial no topo se existir
  const firstOfficial = sorted.find((c) => c.tier === 'oficial')
  if (firstOfficial) {
    picked.push(firstOfficial)
    domains.add(firstOfficial.domain)
    baseDomains.add(baseDomainOf(firstOfficial.domain))
  }

  // 2ª passagem: domínios base distintos (evita que subdomínios da mesma instituição ocupem todas as vagas)
  for (const c of sorted) {
    if (picked.length >= limit) break
    const base = baseDomainOf(c.domain)
    if (!baseDomains.has(base)) {
      picked.push(c)
      domains.add(c.domain)
      baseDomains.add(base)
    }
  }

  // 3ª passagem: preenche vagas com domínios distintos
  for (const c of sorted) {
    if (picked.length >= limit) break
    if (!domains.has(c.domain)) {
      picked.push(c)
      domains.add(c.domain)
    }
  }

  // 4ª passagem: preenche vagas restantes se necessário
  for (const c of sorted) {
    if (picked.length >= limit) break
    if (!picked.includes(c)) picked.push(c)
  }

  return picked
}

/**
 * Seleção global: até `perClaimLimit` por claim e `maxTotal` no total
 * (intercalando as claims), priorizando diversidade e garantindo fontes oficiais.
 */
export function selectSources(
  perClaim: { results: SearchResult[]; claimText?: string }[] | SearchResult[][],
  maxTotal = 5,
  perClaimLimit = 3,
): Candidate[] {
  // Normaliza o input se for array de arrays ou array com claimText
  const normalizedInput = perClaim.map((item) =>
    Array.isArray(item) ? { results: item, claimText: undefined } : item,
  )

  const ranked = normalizedInput.map((item) => rankForClaim(item.results, perClaimLimit, item.claimText))
  const out: Candidate[] = []
  const seen = new Set<string>()
  const perDomain = new Map<string, number>()

  // Prioriza qualquer fonte oficial disponível no conjunto global
  for (const list of ranked) {
    const off = list.find((c) => c.tier === 'oficial')
    if (off && out.length < maxTotal) {
      const key = normalizeUrl(off.url)
      if (!seen.has(key)) {
        seen.add(key)
        perDomain.set(off.domain, (perDomain.get(off.domain) ?? 0) + 1)
        out.push(off)
      }
    }
  }

  // Intercala as demais fontes das claims
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
