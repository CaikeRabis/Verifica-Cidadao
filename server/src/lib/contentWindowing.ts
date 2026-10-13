import { extractKeywords } from './queryGeneration'

/**
 * Seleção de trechos mais relevantes da página com base nos termos das afirmações.
 * Garante que evidências no meio ou no fim da página sejam localizadas e enviadas à IA.
 */

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export interface ScoredBlock {
  text: string
  index: number
  score: number
  matchedTerms: string[]
}

/**
 * Extrai números e anos explícitos de uma afirmação (ex: "1960", "21", "1.412", "1412", "81", "11", "26", "1988", "2022", "4").
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []
  return matches.map((m) => m.replace(/\./g, ''))
}

export function selectRelevantExcerpts(
  fullText: string,
  claims: { id: string; text: string }[],
  maxTotalChars = 6000,
): string {
  if (!fullText || fullText.length <= maxTotalChars) {
    return fullText
  }

  // Coleta termos-chave e números de todas as claims
  const allKeywords = new Set<string>()
  const allNumbers = new Set<string>()

  for (const c of claims) {
    extractKeywords(c.text).forEach((k) => allKeywords.add(norm(k)))
    extractNumbers(c.text).forEach((n) => allNumbers.add(n))
  }

  const keywordList = Array.from(allKeywords)
  const numberList = Array.from(allNumbers)

  // Divide o texto em parágrafos/blocos
  const rawParagraphs = fullText
    .split(/\n+/)
    .map((p) => p.replace(/[ \t\f\v\u00a0]+/g, ' ').trim())
    .filter((p) => p.length >= 25)

  if (rawParagraphs.length === 0) {
    return fullText.slice(0, maxTotalChars)
  }

  // Agrupa parágrafos curtos consecutivos em blocos de 300 a 800 caracteres
  const blocks: { text: string; index: number }[] = []
  let current = ''
  let blockIndex = 0

  for (const p of rawParagraphs) {
    if (current && current.length + p.length > 700) {
      blocks.push({ text: current, index: blockIndex++ })
      current = p
    } else {
      current = current ? `${current}\n${p}` : p
    }
  }
  if (current) {
    blocks.push({ text: current, index: blockIndex++ })
  }

  // Pontua cada bloco
  const scored: ScoredBlock[] = blocks.map((b) => {
    const textNorm = norm(b.text)
    const matchedTerms: string[] = []
    let score = 0

    // Verifica palavras-chave
    for (const kw of keywordList) {
      if (textNorm.includes(kw)) {
        score += 2
        matchedTerms.push(kw)
      }
    }

    // Bônus forte por números/datas da claim (ex: 1960, 1.412, 81, 11)
    for (const num of numberList) {
      if (textNorm.includes(num)) {
        score += 4
        matchedTerms.push(num)
      }
    }

    // Bônus de co-ocorrência: termos próximos na mesma janela
    if (matchedTerms.length >= 2) {
      score += matchedTerms.length * 3
    }

    return {
      text: b.text,
      index: b.index,
      score,
      matchedTerms,
    }
  })

  // Filtra blocos que tiveram pontuação
  const positive = scored.filter((b) => b.score > 0)

  // Se nenhum bloco pontuou, retorna o começo do texto
  if (positive.length === 0) {
    return fullText.slice(0, maxTotalChars)
  }

  // Ordena por maior relevância
  positive.sort((a, b) => b.score - a.score)

  // Seleciona os melhores blocos até o limite de caracteres
  const selected: ScoredBlock[] = []
  let accumulatedChars = 0

  for (const block of positive) {
    if (accumulatedChars + block.text.length > maxTotalChars && selected.length > 0) {
      continue
    }
    selected.push(block)
    accumulatedChars += block.text.length
    if (accumulatedChars >= maxTotalChars) break
  }

  // Reordena os blocos na ordem natural em que aparecem no documento original
  selected.sort((a, b) => a.index - b.index)

  return selected.map((s) => s.text).join('\n\n[...]\n\n')
}
