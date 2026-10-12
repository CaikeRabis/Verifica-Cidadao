import type { Source } from '../types'

/** Fontes de exemplo — apenas visuais nesta fase. */
export const sources: Source[] = [
  {
    id: 'gov-federal',
    name: 'Governo Federal',
    domain: 'gov.br',
    description: 'Portal oficial com serviços, notícias e informações do Poder Executivo federal.',
    url: 'https://www.gov.br',
  },
  {
    id: 'transparencia',
    name: 'Portal da Transparência',
    domain: 'portaltransparencia.gov.br',
    description: 'Dados sobre despesas, contratos, convênios e pagamentos do governo federal.',
    url: 'https://portaldatransparencia.gov.br',
  },
  {
    id: 'senado',
    name: 'Senado Federal',
    domain: 'senado.leg.br',
    description: 'Proposições, votações, legislação e atividade legislativa do Senado.',
    url: 'https://www.senado.leg.br',
  },
  {
    id: 'camara',
    name: 'Câmara dos Deputados',
    domain: 'camara.leg.br',
    description: 'Projetos de lei, votações, gastos parlamentares e atividade da Câmara.',
    url: 'https://www.camara.leg.br',
  },
  {
    id: 'tcu',
    name: 'Tribunais de Contas',
    domain: 'tcu.gov.br',
    description: 'Fiscalização e auditoria do uso de recursos públicos.',
    url: 'https://portal.tcu.gov.br',
  },
  {
    id: 'agencia-brasil',
    name: 'Agência Brasil',
    domain: 'agenciabrasil.ebc.com.br',
    description: 'Agência pública de notícias, com apuração jornalística reconhecida.',
    url: 'https://agenciabrasil.ebc.com.br',
  },
]

export const sourceById = (id: string): Source => {
  const found = sources.find((s) => s.id === id)
  if (!found) throw new Error(`Fonte desconhecida: ${id}`)
  return found
}
