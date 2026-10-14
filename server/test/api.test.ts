import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from '../src/index'
import { loadConfig } from '../src/config'
import type { AiService } from '../src/services/aiService'
import type { SearchProvider } from '../src/services/searchService'
import type { SearchResult } from '../src/types'

describe('Integração HTTP end-to-end do servidor', () => {
  let server: Server
  let baseUrl: string

  const stubAi: AiService = {
    async extractClaims(_input: string) {
      return [{ text: 'Ministério da Saúde repassou 45 milhões' }]
    },
    async extractEvidence(_claims, _sources) {
      return [
        {
          claimId: 'c1',
          sourceId: 's1',
          quote: 'repassou 45 milhões para reforço hospitalar',
          context: 'Nota oficial de empenho',
          stance: 'supports',
        },
      ]
    },
  }

  const stubSearch: SearchProvider = {
    async search(_query: string, _limit: number): Promise<SearchResult[]> {
      return [
        {
          title: 'Cópia da página analisada',
          url: 'https://exemplo.com/materia-final',
          domain: 'exemplo.com',
          snippet: 'Página enviada pelo cidadão.',
        },
        {
          title: 'Portal da Saúde',
          url: 'https://saude.gov.br/noticia',
          domain: 'saude.gov.br',
          snippet: 'Governo federal repassou 45 milhões para reforço hospitalar.',
        },
      ]
    },
  }

  before(async () => {
    const config = loadConfig({ PORT: '0', AI_API_KEY: 'test-key' })
    const app = createApp(config, {
      ai: stubAi,
      search: stubSearch,
      fetcher: async (url) => {
        if (url.includes('vazia')) return { finalUrl: url, contentType: 'text/html', body: '<html><title>Vazia</title><main>curto</main></html>', truncated: false }
        if (url.includes('pdf')) return { finalUrl: url, contentType: 'application/pdf', body: '', truncated: false }
        if (url.includes('materia')) return {
          finalUrl: 'https://exemplo.com/materia-final', contentType: 'text/html', truncated: false,
          body: `<html><head><title>Notícia de teste</title><meta property="article:published_time" content="2024-01-02" /></head><article>${'O Ministério da Saúde repassou 45 milhões para reforço hospitalar. '.repeat(8)}</article></html>`,
        }
        return { finalUrl: url, contentType: 'text/html', body: `<article>${'O Ministério da Saúde repassou 45 milhões para reforço hospitalar. '.repeat(8)}</article>`, truncated: false }
      },
    })
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 8787
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  it('GET /api/health responde 200 com pipelineVersion', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok', pipelineVersion: '0.2.2' })
  })

  it('POST /api/verify responde 400 com erro amigável se body for vazio', async () => {
    const res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
    const data = (await res.json()) as any
    assert.equal(data.error.code, 'invalid_input')
  })

  it('POST /api/verify executa pipeline e responde com contrato completo', async () => {
    const res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'O Ministério da Saúde repassou 45 milhões para reforço hospitalar dos municípios' }),
    })
    assert.equal(res.status, 200)
    const data = (await res.json()) as any
    assert.ok(data.id)
    assert.ok(data.requestId)
    assert.equal(data.pipelineVersion, '0.2.2')
    assert.ok(['confirmada', 'parcialmente-confirmada', 'sem-evidencias', 'contradita', 'analise-humana'].includes(data.classification))
    assert.ok(Array.isArray(data.claims))
    assert.ok(data.claims.length > 0)
    assert.equal(data.claims[0].role, 'primary')
    assert.ok(Array.isArray(data.sources))
    assert.ok(Array.isArray(data.evidences))
    assert.ok(Array.isArray(data.limitations))
    assert.ok(data.summary)
    assert.ok(data.explanation)
    assert.ok(['alta', 'media', 'baixa'].includes(data.confidence))
  })

  it('aceita URL pública, expõe conteúdo analisado e preserva fontes externas', async () => {
    const res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputType: 'url', input: 'https://exemplo.com/materia' }),
    })
    assert.equal(res.status, 200)
    const data = await res.json() as any
    assert.equal(data.analyzedSource.finalUrl, 'https://exemplo.com/materia-final')
    assert.equal(data.analyzedSource.title, 'Notícia de teste')
    assert.equal(data.analyzedSource.publishedDate, '2024-01-02')
    assert.ok(data.sources.every((source: any) => source.url !== data.analyzedSource.finalUrl))
    assert.ok(data.sources.some((source: any) => source.domain === 'saude.gov.br'))
  })

  it('rejeita URL malformada, local, privada, formato não HTML e conteúdo insuficiente', async () => {
    for (const input of ['nota sem protocolo', 'http://localhost/noticia', 'http://127.0.0.1/noticia']) {
      const res = await fetch(`${baseUrl}/api/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputType: 'url', input }) })
      assert.equal(res.status, 422)
    }
    for (const [input, code] of [['https://exemplo.com/pdf', 'unsupported_format'], ['https://exemplo.com/vazia', 'insufficient_content']]) {
      const res = await fetch(`${baseUrl}/api/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputType: 'url', input }) })
      assert.equal((await res.json() as any).error.code, code)
    }
  })
})
