import { randomUUID } from 'node:crypto'
import { AiInvalidResponseError, AiUnavailableError, SearchUnavailableError } from '../errors'
import { guardText } from '../lib/languageSafety'
import { extractKeywords, generateSearchQueries } from '../lib/queryGeneration'
import { selectSources } from '../lib/sourceRanking'
import type {
  ApiEvidence,
  ApiSource,
  Claim,
  Classification,
  ConfidenceLevel,
  SearchResult,
  SourceDoc,
  SourceTier,
  Stance,
  ValidEvidence,
  VerificationResult,
} from '../types'
import type { AiService } from './aiService'
import { classify } from './classification'
import { validateEvidences } from './evidenceValidation'
import type { SearchProvider } from './searchService'
import { defaultFetcher, readSources, type PageFetcher } from './sourceReader'

export interface VerificationDeps {
  ai: AiService
  search: SearchProvider
  fetcher?: PageFetcher
  now?: () => Date
  maxSources?: number
}

const PIPELINE_VERSION = '0.1' as const

const SUMMARY: Record<Classification, string> = {
  confirmada: 'As fontes lidas sustentam a afirmação analisada.',
  'parcialmente-confirmada': 'Parte das afirmações tem respaldo nas fontes lidas, e parte não.',
  'sem-evidencias': 'As fontes lidas não permitem confirmar nem contradizer a afirmação.',
  contradita: 'As fontes consultadas apresentam informações diferentes do que foi afirmado.',
  'analise-humana': 'Não foi possível chegar a uma conclusão segura sobre esta informação.',
}

const EXPLANATION: Record<Exclude<Classification, 'analise-humana'>, string> = {
  confirmada:
    'Nos trechos das páginas que conseguimos ler, encontramos passagens que sustentam o que foi informado e nenhuma que o contrarie. Isso vale apenas para as páginas consultadas e não substitui a conferência dos documentos originais.',
  'parcialmente-confirmada':
    'As afirmações identificadas tiveram resultados diferentes: algumas encontraram respaldo nas fontes lidas e outras não, ou apresentaram divergências. Veja o que foi verificado em cada afirmação e compare com as fontes.',
  'sem-evidencias':
    'As páginas lidas não trazem trechos que confirmem ou contradigam a afirmação. Isso não significa que a informação seja falsa: apenas não há base suficiente nas fontes consultadas. Busque fontes primárias antes de compartilhar.',
  contradita:
    'Os trechos lidos apresentam informações diferentes das que foram afirmadas. Mostramos as divergências encontradas para que você compare com as fontes originais; isso não atribui responsabilidade a ninguém.',
}

const BADGE: Record<Stance, string> = {
  supports: 'Sustenta a afirmação',
  contradicts: 'Diverge da afirmação',
  unclear: 'Trecho ambíguo',
  insufficient: 'Insuficiente',
}

const TIER_TEXT: Record<SourceTier, string> = {
  oficial: 'Fonte oficial ou governamental',
  jornalismo: 'Veículo de imprensa reconhecido',
  outro: 'Outro tipo de fonte (menor prioridade)',
}

const brDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : undefined)

function toApiSource(s: SourceDoc): ApiSource {
  return {
    id: s.id,
    name: s.title,
    title: s.title,
    domain: s.domain,
    description: TIER_TEXT[s.tier],
    url: s.url,
    readStatus: s.readStatus,
    accessedAt: s.accessedAt,
    tier: s.tier,
    publishedAt: s.publishedAt,
  }
}

interface BuildArgs {
  requestId: string
  input: string
  now: Date
  claims: Claim[]
  sources: SourceDoc[]
  evidences?: ApiEvidence[]
  classification: Classification
  confidence: ConfidenceLevel
  confidenceExplanation: string
  humanReason?: string
  limitations: string[]
}

function buildResult(a: BuildArgs): VerificationResult {
  const summary = guardText(SUMMARY[a.classification])
  const rawExplanation =
    a.classification === 'analise-humana'
      ? `${a.humanReason ?? 'O resultado exige interpretação ou confirmação adicional.'} Recomendamos consultar o órgão responsável, a Ouvidoria ou o Serviço de Informação ao Cidadão antes de tirar conclusões.`
      : EXPLANATION[a.classification]
  const explanation = guardText(rawExplanation)
  return {
    id: `vc-${randomUUID()}`,
    requestId: a.requestId,
    pipelineVersion: PIPELINE_VERSION,
    query: a.input,
    classification: a.classification,
    summary: summary.text,
    explanation: explanation.text,
    claims: a.claims,
    confidence: a.confidence,
    confidenceExplanation: a.confidenceExplanation,
    limitations: a.limitations,
    evidences: a.evidences ?? [],
    sources: a.sources.map(toApiSource),
    analyzedAt: a.now.toISOString(),
  }
}

const LOW = 'Pouca base documental para uma conclusão: o resultado depende de leitura humana das fontes.'

/** Pipeline v0.1: claims → busca → seleção → leitura → evidências → classificação → segurança → resposta. */
export async function verify(input: string, deps: VerificationDeps): Promise<VerificationResult> {
  const now = (deps.now ?? (() => new Date()))()
  const requestId = randomUUID().slice(0, 8)
  const fetcher = deps.fetcher ?? defaultFetcher
  const base = { requestId, input, now }
  const limitations: string[] = []

  // 1. Claims (falha da IA aqui interrompe: não há o que verificar)
  const drafts = await deps.ai.extractClaims(input)
  const claims: Claim[] = drafts.slice(0, 3).map((d, i) => ({ id: `c${i + 1}`, text: d.text }))
  if (claims.length === 0) {
    const out = classify({ claims, evidences: [] })
    return buildResult({ ...base, claims, sources: [], ...out, limitations: ['Não foi identificada nenhuma afirmação factual verificável no texto.'] })
  }

  // 2. Busca (gera até 3 consultas complementares por afirmação)
  const perClaimSearches: { results: SearchResult[]; claimText: string }[] = []
  for (const c of claims) {
    const queries = generateSearchQueries(c.text)
    const merged: SearchResult[] = []
    const seenUrls = new Set<string>()
    for (const q of queries) {
      try {
        const results = await deps.search.search(q, 6)
        for (const item of results) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url)
            merged.push(item)
          }
        }
      } catch {
        // falhas pontuais continuam para a próxima consulta complementar
      }
    }
    perClaimSearches.push({ results: merged, claimText: c.text })
  }

  const allSearchesFailed = perClaimSearches.every((p) => p.results.length === 0)
  if (allSearchesFailed) {
    throw new SearchUnavailableError('busca indisponível')
  }

  // 3. Seleção refinada (garante fontes oficiais e diversidade de domínios)
  const selected = selectSources(perClaimSearches, deps.maxSources ?? 5, 3)
  if (selected.length === 0) {
    const out = classify({ claims, evidences: [], noSourcesRead: true })
    return buildResult({ ...base, claims: withStatus(claims, out.claimStatus, []), sources: [], ...out, limitations: [...limitations, 'A busca não retornou páginas relacionadas à afirmação.'] })
  }

  // 4. Leitura real das páginas
  const sources = await readSources(selected, fetcher, () => now)
  const read = sources.filter((s) => s.readStatus === 'read')
  const unread = sources.length - read.length
  if (unread > 0) {
    limitations.push(
      `${unread} página(s) encontrada(s) não puderam ser lidas (indisponíveis, protegidas ou em formato não suportado). Elas aparecem como "não lidas" e não foram usadas como evidência.`,
    )
  }
  if (sources.some((s) => s.readStatus === 'snippet-only')) {
    limitations.push('Para as páginas não lidas havia apenas o resumo exibido pelo buscador, que não é tratado como evidência.')
  }
  if (read.length === 0) {
    const out = classify({ claims, evidences: [], noSourcesRead: true })
    return buildResult({ ...base, claims: withStatus(claims, out.claimStatus, []), sources, ...out, limitations })
  }

  // 5. Evidências (IA) + validação programática obrigatória
  let validEv: ValidEvidence[] = []
  let discarded = 0
  try {
    const raw = await deps.ai.extractEvidence(claims, read)
    const v = validateEvidences(raw, claims, sources)
    validEv = v.valid
    discarded = v.discarded

    // 5b. SEGUNDA RODADA CONTROLADA: se encontrou fontes mas nenhuma evidência válida
    if (validEv.length === 0 && read.length > 0) {
      const readUrls = new Set(sources.map((s) => s.url))
      const retryMerged: SearchResult[] = []
      for (const c of claims) {
        const kw = extractKeywords(c.text).slice(0, 5).join(' ')
        try {
          const res = await deps.search.search(`${kw} dados oficiais`, 6)
          for (const item of res) {
            if (!readUrls.has(item.url) && !retryMerged.some((m) => m.url === item.url)) {
              retryMerged.push(item)
            }
          }
        } catch {}
      }
      if (retryMerged.length > 0) {
        const round2Candidates = selectSources([{ results: retryMerged }], 3, 3)
        if (round2Candidates.length > 0) {
          const round2Sources = await readSources(round2Candidates, fetcher, () => now, sources.length)
          const round2Read = round2Sources.filter((s) => s.readStatus === 'read')
          if (round2Read.length > 0) {
            const raw2 = await deps.ai.extractEvidence(claims, round2Read)
            const v2 = validateEvidences(raw2, claims, [...sources, ...round2Sources])
            if (v2.valid.length > 0) {
              validEv = v2.valid
              sources.push(...round2Sources)
              limitations.push('Foi necessária uma segunda rodada de busca com termos complementares para localizar evidências suficientes.')
            }
          }
        }
      }
    }
  } catch (e) {
    if (!(e instanceof AiUnavailableError || e instanceof AiInvalidResponseError)) throw e
    return buildResult({
      ...base,
      claims,
      sources,
      classification: 'analise-humana',
      confidence: 'baixa',
      confidenceExplanation: LOW,
      humanReason: 'A etapa de análise automática dos trechos ficou indisponível ou devolveu uma resposta inválida.',
      limitations: [...limitations, 'As páginas foram lidas, mas a análise automática dos trechos falhou; nenhuma conclusão foi tirada.'],
    })
  }
  if (discarded > 0) {
    limitations.push('Alguns trechos sugeridos pela IA foram descartados por não constarem literalmente nas páginas lidas.')
  }

  // 6. Classificação por regras + robustez
  const out = classify({ claims, evidences: validEv })

  // 7. Limitações de qualidade
  const allRead = sources.filter((s) => s.readStatus === 'read')
  if (!allRead.some((s) => s.tier === 'oficial')) limitations.push('Nenhuma fonte oficial foi localizada entre as páginas lidas.')
  if (allRead.length > 0 && allRead.every((s) => s.tier === 'outro')) {
    limitations.push('As páginas lidas não são oficiais nem veículos de imprensa da nossa lista de referência.')
  }
  limitations.push('A leitura priorizou os trechos mais relevantes e densos de cada página selecionada.')

  const evidences: ApiEvidence[] = validEv.map((e) => {
    const s = sources.find((x) => x.id === e.sourceId)!
    return {
      id: e.id,
      title: s.title,
      quote: e.quote,
      context: e.context || undefined,
      claimId: e.claimId,
      sourceId: s.id,
      sourceName: s.domain,
      sourceUrl: s.url,
      date: brDate(s.publishedAt),
      foundValue: e.foundValue,
      allegedValue: e.allegedValue,
      badge: BADGE[e.stance],
      stance: e.stance,
    }
  })

  return buildResult({
    ...base,
    claims: withStatus(claims, out.claimStatus, evidences),
    sources,
    evidences,
    ...out,
    limitations,
  })
}

function withStatus(claims: Claim[], status: Record<string, Classification>, evidences: ApiEvidence[]): Claim[] {
  return claims.map((c) => ({
    ...c,
    status: status[c.id],
    evidenceIds: evidences.filter((e) => e.claimId === c.id).map((e) => e.id),
  }))
}
