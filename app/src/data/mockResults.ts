import type { Classification, VerificationResult } from '../types'
import { sourceById } from './sources'

type MockBase = Omit<VerificationResult, 'id' | 'query' | 'analyzedAt'>

/** Um exemplo mockado para cada classificação, para testar cada estado visual. */
export const mockResults: Record<Classification, MockBase> = {
  confirmada: {
    classification: 'confirmada',
    summary: 'A informação é compatível com os registros oficiais consultados.',
    explanation:
      'Os dados citados foram localizados em fontes oficiais e correspondem ao que foi informado, incluindo valores e datas. Não foram encontradas divergências relevantes entre as fontes.',
    sources: [sourceById('transparencia'), sourceById('gov-federal'), sourceById('agencia-brasil')],
  },
  'parcialmente-confirmada': {
    classification: 'parcialmente-confirmada',
    summary: 'Parte da afirmação tem respaldo, mas faltam detalhes importantes.',
    explanation:
      'O fato principal aparece nas fontes consultadas, porém o valor mencionado e o período citado não coincidem totalmente com os registros. Falta contexto para uma conclusão completa.',
    sources: [sourceById('camara'), sourceById('senado'), sourceById('agencia-brasil')],
  },
  'sem-evidencias': {
    classification: 'sem-evidencias',
    summary: 'Não encontramos fontes confiáveis que confirmem ou contradigam a afirmação.',
    explanation:
      'Nas fontes oficiais consultadas não há registros sobre o que foi informado. Isso não significa que seja falso: apenas não há evidências suficientes para uma conclusão. Procure fontes primárias antes de compartilhar.',
    sources: [sourceById('gov-federal'), sourceById('transparencia')],
  },
  contradita: {
    classification: 'contradita',
    summary: 'As fontes consultadas apresentam informações diferentes do que foi afirmado.',
    explanation:
      'Os registros oficiais indicam dados incompatíveis com a afirmação analisada. Recomendamos consultar os documentos originais indicados abaixo. A plataforma não faz acusações: apenas apresenta as divergências encontradas.',
    sources: [sourceById('transparencia'), sourceById('tcu'), sourceById('senado')],
  },
  'analise-humana': {
    classification: 'analise-humana',
    summary: 'O caso é sensível ou complexo demais para uma conclusão automatizada.',
    explanation:
      'O conteúdo envolve informações que exigem interpretação especializada. Recomendamos buscar orientação de órgãos competentes ou de profissionais da área antes de tirar conclusões.',
    sources: [sourceById('tcu'), sourceById('gov-federal')],
  },
}

export const exampleQueries: { label: string; query: string }[] = [
  { label: 'Gastos com obra pública', query: 'O governo federal gastou R$ 2 bilhões na obra X em 2024' },
  { label: 'Mensagem de WhatsApp', query: 'Corre o boato de que o benefício será cancelado para todos' },
  { label: 'Projeto de lei', query: 'Projeto de lei aprovado hoje proíbe o uso de dinheiro em espécie' },
]
