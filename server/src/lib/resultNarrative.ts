import type { Claim, Classification, SourceDoc, ValidEvidence } from '../types'

export interface Narrative {
  summary: string
  explanation: string
}

const compact = (text: string, limit = 190) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).trimEnd()}…`
}

const comparableText = (text: string) =>
  text
    .normalize('NFC')
    .replace(/[“”„"«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

function primaryClaim(claims: Claim[]) {
  return claims.find((claim) => claim.role === 'primary') ?? claims[0]
}

function decisiveEvidence(claim: Claim | undefined, evidences: ValidEvidence[]) {
  const forPrimary = claim ? evidences.filter((evidence) => evidence.claimId === claim.id) : []
  return forPrimary.find((evidence) => evidence.stance === 'supports' || evidence.stance === 'contradicts')
    ?? evidences.find((evidence) => evidence.stance === 'supports' || evidence.stance === 'contradicts')
}

/** Verifica que a narrativa só referencia evidência validada e fonte realmente lida. */
export function isNarrativeConsistent(narrative: Narrative, classification: Classification, sources: SourceDoc[], evidence?: ValidEvidence): boolean {
  if (!narrative.summary || !narrative.explanation) return false
  if ((classification === 'confirmada' || classification === 'contradita') && !evidence) return false
  if (!evidence) return true
  const source = sources.find((item) => item.id === evidence.sourceId)
  return !!source && source.readStatus === 'read' && !!source.text && comparableText(source.text).includes(comparableText(evidence.quote))
}

/** Redação determinística: usa somente claim, quote validado e metadados da fonte. */
export function composeNarrative(args: {
  classification: Classification
  claims: Claim[]
  sources: SourceDoc[]
  evidences: ValidEvidence[]
  humanReason?: string
}): Narrative {
  const claim = primaryClaim(args.claims)
  const evidence = decisiveEvidence(claim, args.evidences)
  const source = evidence ? args.sources.find((item) => item.id === evidence.sourceId) : undefined
  const alleged = claim ? `“${compact(claim.text, 150)}”` : 'a informação enviada'
  const quote = evidence ? `“${compact(evidence.quote)}”` : ''
  const sourceName = source ? source.title || source.domain : 'a fonte lida'

  let narrative: Narrative
  switch (args.classification) {
    case 'confirmada':
      narrative = {
        summary: `A afirmação ${alleged} encontra respaldo em ${sourceName}.`,
        explanation: `A informação analisada afirma que ${alleged}. Na fonte lida ${sourceName}, o trecho validado diz: ${quote}. Esse trecho sustenta a afirmação; por isso, ela foi classificada como confirmada nas fontes consultadas.`,
      }
      break
    case 'contradita':
      narrative = {
        summary: `A afirmação ${alleged} diverge do trecho validado em ${sourceName}.`,
        explanation: `A informação analisada afirma que ${alleged}. Na fonte lida ${sourceName}, o trecho validado diz: ${quote}. Como o trecho apresenta informação diferente da alegação, a classificação é contradita pelas fontes consultadas.`,
      }
      break
    case 'parcialmente-confirmada':
      narrative = {
        summary: `A afirmação principal ${alleged} tem respaldo parcial nas fontes lidas.`,
        explanation: `A informação analisada contém mais de uma afirmação verificável. O trecho validado em ${sourceName} diz: ${quote}. Parte das afirmações encontra respaldo e outra parte apresenta divergência ou contexto adicional; por isso, a classificação é parcialmente confirmada.`,
      }
      break
    case 'sem-evidencias':
      narrative = {
        summary: `As fontes lidas não permitiram confirmar nem contradizer ${alleged}.`,
        explanation: `A informação analisada afirma que ${alleged}. As páginas lidas não forneceram um trecho validado suficiente para confirmar ou contradizer essa afirmação. Isso não prova que ela seja falsa; indica apenas que faltou base documental nas fontes consultadas.`,
      }
      break
    case 'analise-humana':
      narrative = {
        summary: `A informação ${alleged} precisa de análise humana adicional.`,
        explanation: `${args.humanReason ?? 'As evidências disponíveis não permitem uma conclusão automatizada segura.'} A informação analisada é ${alleged}. Recomendamos consultar os documentos originais e o órgão responsável antes de tirar conclusões.`,
      }
      break
  }

  if (isNarrativeConsistent(narrative, args.classification, args.sources, evidence)) return narrative
  return {
    summary: 'A análise foi concluída com ressalvas sobre as evidências disponíveis.',
    explanation: 'Não foi possível produzir uma explicação específica sem risco de atribuir à fonte uma informação que não foi validada. Consulte as evidências e fontes listadas.',
  }
}
