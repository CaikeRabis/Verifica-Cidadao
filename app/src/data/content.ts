import type { EducationTopic, ModuleInfo } from '../types'

export const modules: ModuleInfo[] = [
  {
    id: 'verificador',
    title: 'Verificador de Informações',
    description: 'Verificação de textos, notícias, afirmações, links, imagens e documentos.',
    active: true,
    icon: 'search',
  },
  {
    id: 'radar',
    title: 'Radar da Transparência',
    description:
      'Consulta e compreensão de contratos, licitações, despesas, pagamentos e outros dados públicos.',
    active: false,
    icon: 'document',
  },
  {
    id: 'antes-de-compartilhar',
    title: 'Antes de Compartilhar',
    description: 'Análise rápida de conteúdos recebidos em redes sociais e aplicativos de mensagens.',
    active: false,
    icon: 'share',
  },
  {
    id: 'educacao',
    title: 'Educação Cidadã',
    description:
      'Conteúdos educativos sobre transparência, fontes confiáveis, desinformação e controle social.',
    active: false,
    icon: 'book',
  },
]

export const steps = [
  {
    title: 'Envie uma informação',
    description: 'Você informa um texto, uma afirmação ou um link.',
  },
  {
    title: 'A plataforma analisa',
    description: 'O conteúdo é separado em afirmações verificáveis.',
  },
  {
    title: 'Fontes são consultadas',
    description: 'São priorizadas fontes oficiais e confiáveis.',
  },
  {
    title: 'Você recebe uma análise',
    description: 'O sistema apresenta evidências, fontes e grau de confirmação.',
  },
]

export const educationTopics: EducationTopic[] = [
  {
    id: 'fonte-confiavel',
    title: 'Como identificar uma fonte confiável',
    description: 'Aprenda a reconhecer portais oficiais, órgãos de controle e veículos com apuração responsável.',
    duration: 'Leitura de 4 min',
  },
  {
    id: 'verificar-informacao',
    title: 'Como verificar uma informação',
    description: 'Um passo a passo simples para conferir uma afirmação antes de acreditar ou compartilhar.',
    duration: 'Leitura de 5 min',
  },
  {
    id: 'portal-transparencia',
    title: 'Como consultar um Portal da Transparência',
    description: 'Entenda onde encontrar despesas, contratos e pagamentos e como navegar pelos filtros.',
    duration: 'Leitura de 6 min',
  },
  {
    id: 'empenho-liquidacao-pagamento',
    title: 'O que são empenho, liquidação e pagamento',
    description: 'As três etapas da despesa pública explicadas em linguagem simples, com exemplos.',
    duration: 'Leitura de 5 min',
  },
  {
    id: 'contratacao-publica',
    title: 'Como acompanhar uma contratação pública',
    description: 'Da licitação ao contrato: onde acompanhar cada fase e quais documentos consultar.',
    duration: 'Leitura de 7 min',
  },
  {
    id: 'sinais-desinformacao',
    title: 'Como reconhecer sinais de desinformação',
    description: 'Títulos alarmistas, ausência de fonte, datas incompatíveis e outros sinais de alerta.',
    duration: 'Leitura de 4 min',
  },
]

export const principleText =
  'O Verifica Cidadão não acusa, não substitui órgãos de controle e não substitui análise profissional. A plataforma ajuda você a encontrar evidências e compreender informações.'

export const limitationsText =
  'Esta é uma análise automatizada preliminar e pode conter limitações. Ela não substitui órgãos de controle nem análise profissional. Consulte sempre as fontes oficiais indicadas.'

export const slogan = {
  line1: 'Antes de acreditar.',
  line2: 'Antes de compartilhar.',
  highlight: 'Verifique.',
}
