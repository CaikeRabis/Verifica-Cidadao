/**
 * Geração de consultas de busca complementares para uma afirmação.
 * Produz até 3 consultas objetivas:
 * 1. Consulta direta/literal limpa
 * 2. Consulta institucional/contextual
 * 3. Consulta com operador de fonte oficial quando aplicável (site:gov.br, site:leg.br, site:jus.br)
 */

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'para', 'com', 'por', 'que', 'não', 'se', 'mas', 'como',
  'é', 'foi', 'são', 'eram', 'tem', 'havia', 'este', 'esta',
  'esse', 'essa', 'aquele', 'aquela', 'pelo', 'pela', 'pelos', 'pelas',
])

export function extractKeywords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para busca por chave
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
}

function cleanQuery(text: string): string {
  return text
    .replace(/[“”"«»]/g, ' ')
    .replace(/[?.!,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateSearchQueries(claimText: string): string[] {
  const clean = cleanQuery(claimText)
  const lower = clean.toLowerCase()
  const queries: string[] = []

  // 1. Consulta literal direta (limpa)
  queries.push(clean.slice(0, 150))

  // 2. Consulta institucional / termos complementares
  let institutionalQuery = ''
  let officialSite = ''

  if (/\b(stf|supremo tribunal|ministro|ministros|judiciario)\b/i.test(lower)) {
    institutionalQuery = `Supremo Tribunal Federal composicao ministros ${clean}`
    officialSite = 'site:stf.jus.br'
  } else if (/\b(senado|senador|senadores|congresso nacional)\b/i.test(lower)) {
    institutionalQuery = `Senado Federal composicao senadores ${clean}`
    officialSite = 'site:senado.leg.br'
  } else if (/\b(camara|deputado|deputados)\b/i.test(lower)) {
    institutionalQuery = `Camara dos Deputados composicao ${clean}`
    officialSite = 'site:camara.leg.br'
  } else if (/\b(censo|ibge|populacao)\b/i.test(lower)) {
    institutionalQuery = `IBGE Censo oficial dados ${clean}`
    officialSite = 'site:ibge.gov.br'
  } else if (/\b(constituicao|promulgada|1988)\b/i.test(lower)) {
    institutionalQuery = `Constituicao Federal 1988 planalto oficial`
    officialSite = 'site:planalto.gov.br'
  } else if (/\b(salario minimo|decreto|mandato|presidente da republica)\b/i.test(lower)) {
    institutionalQuery = `Presidencia da Republica oficial ${clean}`
    officialSite = 'site:planalto.gov.br'
  } else if (/\b(vacina|vacinacao|sus|poliomielite|saude)\b/i.test(lower)) {
    institutionalQuery = `Ministerio da Saude SUS oficial ${clean}`
    officialSite = 'site:gov.br'
  } else if (/\b(brasilia|capital|inaugurad|estados|distrito federal)\b/i.test(lower)) {
    institutionalQuery = `dados oficiais Brasil ${clean}`
    officialSite = 'site:gov.br'
  } else {
    institutionalQuery = `${clean} dados oficiais`
    officialSite = 'site:gov.br'
  }

  // Adiciona a consulta institucional (se for diferente da limpa)
  const cleanInst = cleanQuery(institutionalQuery).slice(0, 150)
  if (cleanInst && cleanInst !== queries[0]) {
    queries.push(cleanInst)
  }

  // 3. Consulta com operador de site oficial (se houver domínio relevante)
  if (officialSite) {
    // Pega as palavras-chave mais significativas
    const keywords = extractKeywords(claimText).slice(0, 6).join(' ')
    if (keywords) {
      queries.push(`${keywords} ${officialSite}`.slice(0, 150))
    }
  }

  // Retorna no máximo 3 consultas únicas
  return [...new Set(queries)].slice(0, 3)
}
