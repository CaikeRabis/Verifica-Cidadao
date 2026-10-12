import type { ClassificationMeta, Classification } from '../types'

/** Definições do sistema de classificação (documento-base, seção 7; manual, página 5). */
export const classifications: Record<Classification, ClassificationMeta> = {
  confirmada: {
    label: 'Confirmada',
    short: 'Confirmada',
    description: 'Existem evidências suficientes nas fontes consultadas que sustentam a informação analisada.',
  },
  'parcialmente-confirmada': {
    label: 'Parcialmente confirmada',
    short: 'Parcial',
    description:
      'Parte da informação encontra respaldo nas fontes, mas existem elementos incompletos ou que precisam de contexto.',
  },
  'sem-evidencias': {
    label: 'Sem evidências suficientes',
    short: 'Sem evidências',
    description:
      'Não foram encontradas informações confiáveis suficientes para confirmar ou contradizer a afirmação.',
  },
  contradita: {
    label: 'Contradita pelas fontes consultadas',
    short: 'Contradita',
    description:
      'As fontes confiáveis encontradas apresentam informações incompatíveis com a afirmação analisada.',
  },
  'analise-humana': {
    label: 'Necessita de análise humana',
    short: 'Análise humana',
    description:
      'O caso é complexo, sensível ou possui informações insuficientes para uma conclusão automatizada.',
  },
}

export const classificationOrder: Classification[] = [
  'confirmada',
  'parcialmente-confirmada',
  'sem-evidencias',
  'contradita',
  'analise-humana',
]
