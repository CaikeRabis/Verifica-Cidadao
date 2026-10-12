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
    confidence: 'alta',
    confidenceExplanation:
      'Análise respaldada por múltiplos registros orçamentários oficiais primários e portaria publicada no Diário Oficial da União.',
    claims: [
      {
        id: 'claim-conf-1',
        text: 'Ministério da Saúde repassou R$ 45 milhões para reforço hospitalar dos municípios neste ano.',
        status: 'confirmada',
        statusLabel: 'Fato confirmado',
        evidenceIds: ['ev-conf-1', 'ev-conf-2', 'ev-conf-3'],
      },
    ],
    evidences: [
      {
        id: 'ev-conf-1',
        claimId: 'claim-conf-1',
        title: 'Nota de Empenho no Portal da Transparência',
        description: 'Registro orçamentário oficial confirmando a destinação e liquidação dos recursos para o programa citado.',
        quote: 'Nota de Empenho nº 2024NE001429 — Favorecido: Fundo Nacional de Saúde — Valor liquidado: R$ 45.000.000,00',
        sourceName: 'Portal da Transparência',
        sourceId: 'transparencia',
        date: '18/03/2024',
        badge: 'Registro financeiro oficial',
        context: 'Os valores e a data coincidem com a declaração pública analisada.',
      },
      {
        id: 'ev-conf-2',
        claimId: 'claim-conf-1',
        title: 'Publicação no Diário Oficial da União',
        description: 'Portaria ministerial autorizando o repasse e detalhando o cronograma de liberação dos recursos.',
        quote: 'Portaria GM/MS nº 892 de 15 de março de 2024, publicada no DOU Seção 1, pág. 72.',
        sourceName: 'Governo Federal',
        sourceId: 'gov-federal',
        date: '15/03/2024',
        badge: 'Ato normativo publicado',
        context: 'Ato oficial em vigor, sem alterações ou revogações posteriores.',
      },
      {
        id: 'ev-conf-3',
        claimId: 'claim-conf-1',
        title: 'Comunicação oficial na Agência Brasil',
        description: 'Reportagem com declaração do ministério responsável detalhando os critérios públicos de distribuição.',
        quote: '“Os recursos serão distribuídos aos municípios conforme critérios técnicos, epidemiológicos e populacionais.”',
        sourceName: 'Agência Brasil',
        sourceId: 'agencia-brasil',
        date: '19/03/2024',
        badge: 'Apuração pública',
      },
    ],
    sources: [sourceById('transparencia'), sourceById('gov-federal'), sourceById('agencia-brasil')],
  },
  'parcialmente-confirmada': {
    classification: 'parcialmente-confirmada',
    summary: 'Parte da afirmação tem respaldo, mas faltam detalhes importantes.',
    explanation:
      'O fato principal aparece nas fontes consultadas, porém o status de tramitação e o alcance real não coincidem totalmente com o que foi afirmado. Falta contexto para uma conclusão completa.',
    confidence: 'media',
    confidenceExplanation:
      'Evidências oficiais parciais: o trâmite legislativo foi localizado, mas a aprovação final em plenário ainda não ocorreu.',
    claims: [
      {
        id: 'claim-parc-1',
        text: 'Projeto de lei que altera regras de aposentadoria foi aprovado na Comissão de Constituição e Justiça.',
        status: 'confirmada',
        statusLabel: 'Parte confirmada',
        evidenceIds: ['ev-parc-1'],
      },
      {
        id: 'claim-parc-2',
        text: 'A matéria já virou lei definitiva e passa a valer imediatamente para todos.',
        status: 'contradita',
        statusLabel: 'Sem respaldo legal',
        evidenceIds: ['ev-parc-2'],
      },
    ],
    limitations: [
      'A tramitação legislativa no Congresso Nacional é dinâmica e sujeita a novas deliberações de pauta.',
      'A análise reflete os registros do Portal da Câmara e do Senado disponíveis até a data da consulta.',
    ],
    evidences: [
      {
        id: 'ev-parc-1',
        claimId: 'claim-parc-1',
        title: 'Aprovação em Comissão Temática da Câmara',
        description: 'O projeto de lei realmente tramitou e recebeu parecer favorável na Comissão de Constituição e Justiça.',
        quote: 'Parecer do Relator aprovado por unanimidade na CCJC em 05/06/2024.',
        sourceName: 'Câmara dos Deputados',
        sourceId: 'camara',
        date: '05/06/2024',
        badge: 'Parte confirmada',
        context: 'A proposta avançou na comissão técnica, como informado na mensagem analisada.',
      },
      {
        id: 'ev-parc-2',
        claimId: 'claim-parc-2',
        title: 'Status atual: matéria ainda aguarda deliberação no Plenário',
        description: 'Ao contrário do que afirma a mensagem viral, a matéria ainda não é lei em vigor nem foi votada pelo plenário das duas Casas.',
        quote: 'Situação: Aguardando inclusão na Ordem do Dia do Plenário. Texto pendente de votação.',
        sourceName: 'Senado Federal',
        sourceId: 'senado',
        date: '12/08/2024',
        badge: 'Contexto ausente',
        context: 'Não há validade legal imediata nem sanção presidencial até a conclusão do processo legislativo.',
      },
    ],
    sources: [sourceById('camara'), sourceById('senado'), sourceById('agencia-brasil')],
  },
  'sem-evidencias': {
    classification: 'sem-evidencias',
    summary: 'Não encontramos fontes confiáveis que confirmem ou contradigam a afirmação.',
    explanation:
      'Nas fontes oficiais consultadas não há registros sobre o que foi informado. Isso não significa que seja falso: apenas não há evidências suficientes para uma conclusão. Procure fontes primárias antes de compartilhar.',
    confidence: 'baixa',
    confidenceExplanation:
      'Registros oficiais insuficientes nos portais públicos federais e estaduais para embasar uma confirmação.',
    claims: [
      {
        id: 'claim-sem-1',
        text: 'Circula mensagem informando que determinado benefício social será suspenso para todos os inscritos.',
        status: 'sem-evidencias',
        statusLabel: 'Não registrado',
        evidenceIds: ['ev-sem-1', 'ev-sem-2'],
      },
    ],
    limitations: [
      'A ausência de registros oficiais nos portais de transparência não permite validar a alegação neste momento.',
      'Informações administrativas em fase preparatória interna podem não constar imediatamente nos sistemas públicos abertos.',
    ],
    evidences: [
      {
        id: 'ev-sem-1',
        claimId: 'claim-sem-1',
        title: 'Busca nos sistemas oficiais e atos normativos',
        description: 'Não foram localizadas portarias, notas técnicas ou comunicados referentes ao suposto cancelamento do benefício.',
        quote: 'Consulta aos termos nos sistemas oficiais do Poder Executivo em 2024 retornou zero registros correspondentes.',
        sourceName: 'Governo Federal',
        sourceId: 'gov-federal',
        date: '2024',
        badge: 'Ausência de registro',
        context: 'A ausência de evidências nas fontes públicas não permite validar a alegação neste momento.',
      },
      {
        id: 'ev-sem-2',
        claimId: 'claim-sem-1',
        title: 'Consulta a canais de transparência pública',
        description: 'Nenhum relatório de auditoria ou alerta institucional confirma a interrupção mencionada no conteúdo.',
        sourceName: 'Portal da Transparência',
        sourceId: 'transparencia',
        badge: 'Verificação em canais primários',
      },
    ],
    sources: [sourceById('gov-federal'), sourceById('transparencia')],
  },
  contradita: {
    classification: 'contradita',
    summary: 'As fontes consultadas apresentam informações diferentes do que foi afirmado.',
    explanation:
      'Os registros oficiais indicam dados incompatíveis com a afirmação analisada. Recomendamos consultar os documentos originais indicados abaixo. A plataforma não faz acusações: apenas apresenta as divergências encontradas.',
    confidence: 'alta',
    confidenceExplanation:
      'Contrato administrativo publicado no Portal da Transparência e acórdão do Tribunal de Contas apresentam valores divergentes.',
    claims: [
      {
        id: 'claim-contra-1',
        text: 'O governo federal gastou R$ 2 bilhões na pavimentação da rodovia municipal em 2024.',
        status: 'contradita',
        statusLabel: 'Divergência factual',
        evidenceIds: ['ev-contra-1', 'ev-contra-2'],
      },
    ],
    evidences: [
      {
        id: 'ev-contra-1',
        claimId: 'claim-contra-1',
        title: 'Contrato Administrativo nº 48/2023 no Portal da Transparência',
        description: 'O valor oficial contratado para a obra é substancialmente menor do que o montante alegado na publicação.',
        allegedValue: 'R$ 2.000.000.000,00 (R$ 2 bilhões)',
        foundValue: 'R$ 15.420.000,00 (R$ 15,4 milhões)',
        quote: 'Contrato Administrativo nº 48/2023 — Objeto: Drenagem e Pavimentação Asfáltica — Valor global contratado: R$ 15.420.000,00',
        sourceName: 'Portal da Transparência',
        sourceId: 'transparencia',
        date: '22/11/2023',
        badge: 'Divergência de valores',
        context: 'Exemplo demonstrativo fictício para ilustrar a confrontação objetiva entre publicações virais e contratos públicos reais.',
      },
      {
        id: 'ev-contra-2',
        claimId: 'claim-contra-1',
        title: 'Relatório de Auditoria do Tribunal de Contas da União',
        description: 'A fiscalização ordinária referente ao convênio não aponta os valores astronômicos citados no conteúdo analisado.',
        quote: 'Acórdão nº 1.205/2024-TCU-Plenário — Fiscalização concluída sem achados de valores divergentes dos termos pactuados.',
        sourceName: 'Tribunais de Contas',
        sourceId: 'tcu',
        date: '14/05/2024',
        badge: 'Relatório de fiscalização',
        context: 'As fontes oficiais apresentam dados incompatíveis com a afirmação.',
      },
    ],
    sources: [sourceById('transparencia'), sourceById('tcu'), sourceById('senado')],
  },
  'analise-humana': {
    classification: 'analise-humana',
    summary: 'O caso é sensível ou complexo demais para uma conclusão automatizada.',
    explanation:
      'O conteúdo envolve informações que exigem interpretação jurídica ou documental especializada. Recomendamos buscar orientação de órgãos competentes ou de profissionais da área antes de tirar conclusões.',
    confidence: 'media',
    confidenceExplanation:
      'Processo administrativo com manifestações divergentes entre órgãos de controle, sem trânsito em julgado.',
    claims: [
      {
        id: 'claim-hum-1',
        text: 'Houve irregularidade na contratação por dispensa de licitação do termo aditivo.',
        status: 'analise-humana',
        statusLabel: 'Controvérsia técnica',
        evidenceIds: ['ev-humana-1'],
      },
    ],
    limitations: [
      'O processo administrativo possui recursos e prazos de resposta em andamento junto ao Tribunal de Contas.',
      'Não há decisão terminativa ou trânsito em julgado sobre a matéria.',
    ],
    evidences: [
      {
        id: 'ev-humana-1',
        claimId: 'claim-hum-1',
        title: 'Pareceres jurídicos divergentes em processo de contratação',
        description: 'O processo administrativo possui manifestações divergentes entre órgãos de controle interno e externo sobre o alcance da regra de dispensa.',
        quote: 'Processo nº 08420.001924/2023 — Análise de dispensa de licitação com interpretações jurídicas concorrentes.',
        sourceName: 'Tribunais de Contas',
        sourceId: 'tcu',
        date: '10/06/2024',
        badge: 'Complexidade regulatória',
        context: 'Por envolver controvérsia jurídica em aberto, o caso requer acompanhamento qualificado e não deve ser julgado de forma precipitada.',
      },
    ],
    sources: [sourceById('tcu'), sourceById('gov-federal')],
  },
}

export const exampleQueries: { label: string; query: string }[] = [
  {
    label: 'Gasto com obra (valor divergente)',
    query: 'O governo federal gastou R$ 2 bilhões na pavimentação da rodovia municipal em 2024',
  },
  {
    label: 'Projeto de lei em tramitação',
    query: 'Projeto de lei que altera regras de aposentadoria já virou lei definitiva e passa a valer amanhã',
  },
  {
    label: 'Repasse para a saúde pública',
    query: 'Ministério da Saúde repassou R$ 45 milhões para reforço hospitalar dos municípios neste ano',
  },
]
