/**
 * Chave de identidade de recurso para impedir que uma página analisada se
 * valide por uma variante de si mesma. Não é usada para fetch ou segurança de
 * rede; preserva parâmetros funcionais e só remove metadados de tracking.
 */
const TRACKING_PARAM = /^(?:utm_|fbclid$|gclid$)/i

function decodeUnreserved(pathname: string) {
  return pathname.replace(/%[0-9a-f]{2}/gi, (encoded) => {
    const code = Number.parseInt(encoded.slice(1), 16)
    const char = String.fromCharCode(code)
    return /[A-Za-z0-9\-._~]/.test(char) ? char : encoded.toUpperCase()
  })
}

export function canonicalUrlKey(raw: string): string {
  try {
    const url = new URL(raw)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = decodeUnreserved(url.pathname).replace(/\/+$/, '') || '/'
    const parameters = [...url.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAM.test(key))
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    // O protocolo não identifica conteúdo para este bloqueio: http/https do
    // mesmo host e caminho podem representar o mesmo recurso após redirect.
    return `${hostname}${pathname}${parameters ? `?${parameters}` : ''}`
  } catch {
    return raw.trim()
  }
}

export function isSameUrlIdentity(candidateUrl: string, analyzedUrls: Iterable<string>): boolean {
  const candidate = canonicalUrlKey(candidateUrl)
  for (const analyzed of analyzedUrls) {
    if (candidate === canonicalUrlKey(analyzed)) return true
  }
  return false
}
