import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

export class UnsafeUrlError extends Error {}
export class FetchFailedError extends Error {}

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split('.').map(Number)
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true
  return false
}

function isPrivateV6(ip: string): boolean {
  const l = ip.toLowerCase()
  if (l === '::' || l === '::1') return true
  const mapped = l.match(/^::ffff:(.+)$/)
  if (mapped) {
    const rest = mapped[1]
    if (net.isIP(rest) === 4) return isPrivateV4(rest)
    const m = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (m) {
      const hi = parseInt(m[1], 16)
      const lo = parseInt(m[2], 16)
      return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return true
  }
  const first = parseInt(l.split(':')[0] || '0', 16)
  if (first === 0) return true
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10
  if ((first & 0xff00) === 0xff00) return true // multicast
  return false
}

/** true para loopback, redes privadas, link-local, metadata de nuvem, multicast etc. */
export function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip)
  if (v === 4) return isPrivateV4(ip)
  if (v === 6) return isPrivateV6(ip)
  return true
}

/** Valida a URL antes de qualquer requisição (protocolo, porta, host literal). */
export function validatePublicUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError('URL inválida')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('protocolo não permitido')
  if (url.username || url.password) throw new UnsafeUrlError('credenciais na URL')
  if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError('porta não permitida')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan')
  ) {
    throw new UnsafeUrlError('host local não permitido')
  }
  if (net.isIP(host) && isPrivateIp(host)) throw new UnsafeUrlError('IP privado não permitido')
  return url
}

/**
 * `lookup` que valida o IP resolvido NO MOMENTO DA CONEXÃO — protege contra
 * hostnames públicos que resolvem para IPs internos (incl. DNS rebinding).
 */
function guardedLookup(hostname: string, options: dns.LookupOptions, callback: (...args: any[]) => void) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err)
    const list = addresses as dns.LookupAddress[]
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return callback(new UnsafeUrlError('endereço resolvido não permitido'))
    }
    if (options.all) return callback(null, list)
    return callback(null, list[0].address, list[0].family)
  })
}

export interface FetchOptions {
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
}

export interface FetchedText {
  finalUrl: string
  contentType: string
  body: string
  truncated: boolean
}

type Hop = FetchedText & { redirect?: string }

function decodeBody(buf: Buffer, contentType: string): string {
  let charset = contentType.match(/charset=([\w-]+)/i)?.[1]
  if (!charset) {
    const head = buf.subarray(0, 2048).toString('latin1')
    charset = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  }
  try {
    return new TextDecoder(charset || 'utf-8').decode(buf)
  } catch {
    return buf.toString('utf8')
  }
}

function requestOnce(url: URL, budgetMs: number, maxBytes: number): Promise<Hop> {
  return new Promise<Hop>((resolve, reject) => {
    if (budgetMs <= 0) return reject(new FetchFailedError('timeout'))
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(
      url,
      {
        method: 'GET',
        lookup: guardedLookup as never,
        headers: {
          'User-Agent': 'VerificaCidadaoBot/0.1 (verificacao informativa)',
          Accept: 'text/html,text/plain;q=0.9',
          'Accept-Encoding': 'identity', // evita bombas de descompressão
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        const location = res.headers.location
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          res.resume()
          return done(() => resolve({ redirect: location, finalUrl: url.toString(), contentType: '', body: '', truncated: false }))
        }
        if (status < 200 || status >= 300) {
          res.resume()
          return done(() => reject(new FetchFailedError(`HTTP ${status}`)))
        }
        const contentType = String(res.headers['content-type'] || '').toLowerCase()
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          res.resume()
          return done(() => reject(new FetchFailedError('tipo de conteúdo não suportado')))
        }
        const chunks: Buffer[] = []
        let size = 0
        let truncated = false
        const finish = () =>
          done(() =>
            resolve({
              finalUrl: url.toString(),
              contentType,
              body: decodeBody(Buffer.concat(chunks), contentType),
              truncated,
            }),
          )
        res.on('data', (chunk: Buffer) => {
          if (truncated) return
          size += chunk.length
          if (size > maxBytes) {
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)))
            truncated = true
            res.destroy()
            finish()
          } else {
            chunks.push(chunk)
          }
        })
        res.on('end', finish)
        res.on('error', (e) => (truncated ? finish() : done(() => reject(new FetchFailedError(e.message)))))
        res.on('close', () => {
          if (!res.complete && !truncated) done(() => reject(new FetchFailedError('conexão interrompida')))
        })
      },
    )
    const timer = setTimeout(() => {
      req.destroy()
      done(() => reject(new FetchFailedError('timeout')))
    }, budgetMs)
    req.on('error', (e) => done(() => reject(e instanceof UnsafeUrlError ? e : new FetchFailedError(e.message))))
    req.end()
  })
}

/**
 * Busca texto de uma URL pública com: validação de host/IP (inclusive após DNS),
 * redirects revalidados a cada salto, timeout total, limite de bytes e
 * somente text/html ou text/plain.
 */
export async function fetchText(raw: string, opts: FetchOptions = {}): Promise<FetchedText> {
  const { timeoutMs = 8000, maxBytes = 800_000, maxRedirects = 3 } = opts
  const deadline = Date.now() + timeoutMs
  let current = raw
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = validatePublicUrl(current)
    const res = await requestOnce(url, deadline - Date.now(), maxBytes)
    if (res.redirect) {
      current = new URL(res.redirect, url).toString()
      continue
    }
    return res
  }
  throw new FetchFailedError('redirecionamentos demais')
}
