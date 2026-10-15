export interface EducationCallout {
  type: 'attention' | 'example'
  title: string
  text: string
}

export interface EducationSection {
  title: string
  paragraphs?: string[]
  bullets?: string[]
  callouts?: EducationCallout[]
}

export interface EducationManual {
  slug: string
  title: string
  description: string
  duration: string
  introduction: string[]
  sections: EducationSection[]
  checklist?: string[]
  summary: string[]
}

export const educationManuals: EducationManual[] = [
  {
    slug: 'fonte-confiavel',
    title: 'Como identificar uma fonte confiável',
    description: 'Aprenda a reconhecer portais oficiais, órgãos de controle e veículos com apuração responsável.',
    duration: 'Leitura de 4 min',
    introduction: [
      'Uma informação confiável não depende apenas de parecer verdadeira. É importante saber quem publicou, em que contexto e quais evidências sustentam o conteúdo.',
      'Antes de acreditar ou compartilhar, faça uma leitura cuidadosa da fonte.',
    ],
    sections: [
      {
        title: 'Quem publicou a informação?',
        paragraphs: ['Comece identificando a autoria. Procure saber se o conteúdo foi publicado por:'],
        bullets: ['órgão público ou portal oficial;', 'instituição de pesquisa;', 'veículo jornalístico com identificação editorial;', 'especialista com atuação reconhecida no tema;', 'pessoa ou página sem identificação verificável.'],
        callouts: [{ type: 'attention', title: 'Atenção', text: 'Um site com aparência profissional ou uma conta com muitos seguidores não é, por si só, uma garantia de confiabilidade.' }],
      },
      {
        title: 'A fonte apresenta evidências?',
        paragraphs: ['Informações confiáveis costumam indicar de onde vieram os dados. Verifique se há links para documentos, pesquisas, bases públicas, decisões, contratos ou entrevistas identificáveis.', 'Desconfie de afirmações que usam frases como “todo mundo sabe”, “fontes dizem” ou “está comprovado”, mas não mostram nenhuma evidência.'],
      },
      {
        title: 'A fonte é adequada para o assunto?',
        paragraphs: ['Uma fonte pode ser confiável em um tema e inadequada em outro. Para dados sobre orçamento público, por exemplo, dê preferência a portais da transparência, tribunais de contas e documentos oficiais. Para temas científicos, procure instituições de pesquisa e publicações especializadas.'],
      },
      {
        title: 'A informação está atualizada?',
        paragraphs: ['Uma notícia antiga pode circular novamente como se fosse atual. Confira a data de publicação e pergunte: a informação ainda vale para o contexto de hoje?', 'Em assuntos que mudam com frequência, como orçamento, preços, normas, políticas públicas e indicadores, a data é parte essencial da verificação.'],
      },
      {
        title: 'Existem fontes independentes confirmando a informação?',
        paragraphs: ['Quando diferentes fontes confiáveis chegam à mesma conclusão de forma independente, a informação ganha mais consistência. Repetições do mesmo texto em vários sites não significam confirmação: eles podem estar reproduzindo uma única origem.'],
      },
      {
        title: 'Tipos de fonte',
        bullets: ['Fontes primárias: documentos originais, dados oficiais, decisões, contratos, pesquisas e entrevistas diretas.', 'Fontes secundárias: reportagens, análises e explicações baseadas em fontes primárias.', 'Opiniões e redes sociais: podem levantar questões relevantes, mas exigem verificação adicional.'],
      },
    ],
    checklist: ['Quem publicou?', 'A fonte mostra evidências?', 'A fonte é adequada para esse assunto?', 'A informação está atualizada?', 'Outras fontes independentes confirmam?'],
    summary: ['Confiar não é acreditar cegamente. É observar a origem, as evidências, a data e a adequação da fonte ao assunto.'],
  },
  {
    slug: 'verificar-informacao',
    title: 'Como verificar uma informação',
    description: 'Um passo a passo simples para conferir uma afirmação antes de acreditar ou compartilhar.',
    duration: 'Leitura de 5 min',
    introduction: ['Verificar uma informação é um processo. Nem sempre é possível chegar a uma resposta definitiva rapidamente, mas alguns passos ajudam a reduzir erros e evitar conclusões precipitadas.'],
    sections: [
      {
        title: '1. Identifique a afirmação central',
        paragraphs: ['Pergunte: o que exatamente está sendo afirmado?'],
        callouts: [{ type: 'example', title: 'Exemplo', text: '“O órgão X recebeu R$ 10 milhões em 2025.” A afirmação contém entidade, valor e período. Esses elementos orientam a busca por evidências.' }],
      },
      { title: '2. Verifique a data e o contexto', paragraphs: ['Uma afirmação pode ser verdadeira em determinado momento e incorreta em outro. Observe datas, períodos e circunstâncias.', '“O órgão possui 15 integrantes” pode depender do ano, da composição ou da regra considerada.'] },
      { title: '3. Procure fontes originais', paragraphs: ['Dê preferência a documentos, dados públicos, relatórios, leis, decisões e comunicados oficiais. Quando possível, vá além de resumos e procure a fonte primária.'] },
      { title: '4. Compare mais de uma fonte', paragraphs: ['Uma única fonte pode estar incompleta ou equivocada. Compare informações em fontes independentes e observe se elas tratam do mesmo fato, período e contexto.'] },
      { title: '5. Leia além do título', paragraphs: ['Títulos chamam atenção, mas podem simplificar ou omitir detalhes importantes. Leia o conteúdo completo e verifique se o título corresponde ao que o texto realmente informa.'] },
      { title: '6. Observe números e percentuais', paragraphs: ['Números precisam de contexto. Pergunte: 50% de quê? Em comparação com qual período? O valor é previsto, empenhado, pago ou estimado?'] },
      { title: '7. Reconheça quando não há evidência suficiente', paragraphs: ['Nem toda informação pode ser confirmada ou refutada com os dados disponíveis. Quando faltam documentos, fontes confiáveis ou contexto, a conclusão responsável pode ser reconhecer a insuficiência de evidências.'] },
    ],
    summary: ['Verificar é identificar a afirmação, situá-la no tempo e no contexto, buscar fontes originais, comparar evidências e reconhecer os limites do que é possível concluir.'],
  },
  {
    slug: 'portal-transparencia',
    title: 'Como consultar um Portal da Transparência',
    description: 'Entenda onde encontrar despesas, contratos e pagamentos e como navegar pelos filtros.',
    duration: 'Leitura de 6 min',
    introduction: ['Portais da Transparência reúnem informações sobre receitas, despesas, contratos, licitações, servidores e outros dados públicos. Eles permitem acompanhar como recursos públicos são planejados e utilizados.'],
    sections: [
      { title: 'O que é possível encontrar?', bullets: ['despesas públicas;', 'contratos e licitações;', 'pagamentos realizados;', 'convênios e transferências;', 'dados sobre servidores;', 'programas e ações governamentais.'] },
      { title: 'Antes de pesquisar, defina o que você procura', paragraphs: ['Uma boa pesquisa começa com uma pergunta clara.'], callouts: [{ type: 'example', title: 'Exemplo', text: 'Em vez de procurar apenas “obra”, tente: município, órgão responsável, período, empresa contratada ou número do contrato.' }] },
      { title: 'Use filtros', paragraphs: ['Os portais costumam permitir filtros por ano, órgão, fornecedor, tipo de despesa, programa, função ou localidade. Ajustar os filtros ajuda a reduzir resultados irrelevantes.'] },
      { title: 'Diferencie as etapas da despesa', paragraphs: ['Ao consultar valores, observe se eles são planejados, empenhados, liquidados ou pagos. Esses termos representam momentos diferentes da execução do gasto público.'] },
      { title: 'Procure o documento relacionado', paragraphs: ['Quando encontrar um registro relevante, procure documentos associados: edital, contrato, nota de empenho, ordem de pagamento, relatório ou publicação oficial.'] },
      { title: 'Compare períodos equivalentes', paragraphs: ['Para comparar gastos, use períodos semelhantes. Comparar um mês com um ano inteiro, por exemplo, pode levar a interpretações equivocadas.'] },
      { title: 'Registre o que você encontrou', paragraphs: ['Anote o link, a data da consulta, os filtros usados e os documentos relacionados. Isso facilita revisões e permite que outras pessoas acompanhem o caminho da pesquisa.'] },
    ],
    checklist: ['Defini a pergunta de pesquisa?', 'Usei filtros adequados?', 'Verifiquei a etapa da despesa?', 'Encontrei o documento relacionado?', 'Registrei links, datas e filtros?'],
    summary: ['Consultar um portal da transparência exige contexto. Defina a pergunta, use filtros, verifique a etapa da despesa e procure os documentos que sustentam o registro.'],
  },
  {
    slug: 'empenho-liquidacao-pagamento',
    title: 'O que são empenho, liquidação e pagamento',
    description: 'As três etapas da despesa pública explicadas em linguagem simples, com exemplos.',
    duration: 'Leitura de 5 min',
    introduction: ['Na execução de uma despesa pública, os valores passam por etapas diferentes. Entender esses termos evita interpretações equivocadas sobre quanto foi apenas previsto, quanto foi reconhecido e quanto foi efetivamente pago.'],
    sections: [
      { title: 'Empenho', paragraphs: ['O empenho é a reserva de recursos para uma despesa. Ele indica que o poder público assumiu o compromisso de gastar determinado valor. Ainda não significa que o serviço foi realizado ou que o pagamento ocorreu.'], callouts: [{ type: 'example', title: 'Exemplo ilustrativo', text: 'Um órgão empenha R$ 100 mil para reformar uma escola. Esse valor foi reservado, mas a obra ainda pode não ter começado.' }] },
      { title: 'Liquidação', paragraphs: ['A liquidação acontece quando a administração verifica que o serviço foi prestado ou que o bem foi entregue conforme o contratado. É a etapa em que se reconhece que existe uma obrigação a pagar.'], callouts: [{ type: 'example', title: 'Exemplo ilustrativo', text: 'Parte da reforma foi concluída e conferida. O órgão liquida R$ 40 mil referentes ao serviço executado.' }] },
      { title: 'Pagamento', paragraphs: ['O pagamento é a saída efetiva do recurso. Ele ocorre quando o valor é transferido ao fornecedor ou beneficiário.'], callouts: [{ type: 'example', title: 'Exemplo ilustrativo', text: 'Após a liquidação, o órgão paga os R$ 40 mil à empresa responsável pela obra.' }] },
      { title: 'Por que essa diferença importa?', paragraphs: ['Um valor empenhado não significa que foi pago. Um contrato pode ter valor alto, mas os pagamentos podem ocorrer em etapas ou sequer serem realizados integralmente.'] },
      { title: 'Perguntas úteis ao analisar uma despesa', bullets: ['O valor foi apenas empenhado ou já foi pago?', 'O serviço foi executado?', 'Existe documento que comprove a liquidação?', 'O pagamento corresponde ao contrato?', 'O período analisado está correto?'] },
    ],
    summary: ['Empenho reserva recursos; liquidação reconhece que o serviço ou bem foi entregue; pagamento transfere o dinheiro. As três etapas precisam ser consideradas para interpretar corretamente uma despesa pública.'],
  },
  {
    slug: 'contratacao-publica',
    title: 'Como acompanhar uma contratação pública',
    description: 'Da licitação ao contrato: onde acompanhar cada fase e quais documentos consultar.',
    duration: 'Leitura de 7 min',
    introduction: ['Uma contratação pública envolve diferentes etapas, documentos e decisões. Acompanhar esse processo ajuda a entender como recursos públicos são usados e quais responsabilidades foram assumidas.'],
    sections: [
      { title: '1. Identifique a necessidade', paragraphs: ['Toda contratação deve partir de uma necessidade pública: uma obra, um serviço, a compra de materiais ou a contratação de profissionais. Procure documentos de planejamento, estudos técnicos ou justificativas.'] },
      { title: '2. Consulte o edital ou aviso', paragraphs: ['O edital informa regras, prazos, critérios e condições da contratação. Leia com atenção o objeto, os requisitos e os critérios de julgamento.'] },
      { title: '3. Verifique quem participou', paragraphs: ['Em processos competitivos, procure saber quais empresas participaram, quais propostas foram apresentadas e se houve recursos ou impugnações.'] },
      { title: '4. Identifique o vencedor', paragraphs: ['Confira a empresa vencedora, o valor contratado, o objeto e a justificativa da escolha.'] },
      { title: '5. Acompanhe o contrato', paragraphs: ['Após a contratação, verifique o contrato, sua vigência, eventuais aditivos, valores e responsabilidades.'] },
      { title: '6. Observe a execução', paragraphs: ['Acompanhe se o serviço foi realizado, se houve entregas parciais, pagamentos, alterações de prazo ou problemas registrados.'], callouts: [{ type: 'attention', title: 'Atenção', text: 'Um contrato publicado não significa que todo o valor já foi pago ou que o serviço foi concluído.' }] },
      { title: '7. Use bases públicas', paragraphs: ['Procure informações em portais da transparência, diários oficiais, sistemas de compras públicas, tribunais de contas e sites dos órgãos responsáveis.'] },
    ],
    summary: ['Acompanhar uma contratação pública é olhar para o processo inteiro: necessidade, edital, participantes, vencedor, contrato e execução.'],
  },
  {
    slug: 'sinais-desinformacao',
    title: 'Como reconhecer sinais de desinformação',
    description: 'Títulos alarmistas, ausência de fonte, datas incompatíveis e outros sinais de alerta.',
    duration: 'Leitura de 4 min',
    introduction: ['Desinformação não é apenas uma informação falsa. Ela também pode envolver conteúdos verdadeiros fora de contexto, números apresentados de forma enganosa ou imagens usadas em situações diferentes da original.'],
    sections: [
      { title: '1. Linguagem alarmista', paragraphs: ['Mensagens que tentam provocar medo, indignação imediata ou urgência podem estimular o compartilhamento sem verificação.'] },
      { title: '2. Ausência de fonte', paragraphs: ['Se não é possível saber quem publicou, de onde vieram os dados ou qual documento sustenta a afirmação, a informação exige cautela.'] },
      { title: '3. Falta de data', paragraphs: ['Conteúdos antigos podem circular como se fossem atuais. Verifique quando a informação foi publicada e a que período ela se refere.'] },
      { title: '4. Número sem contexto', paragraphs: ['Valores e percentuais precisam de referência. Um aumento de 50% pode parecer expressivo, mas é preciso saber em relação a quê e em qual período.'] },
      { title: '5. Citação recortada', paragraphs: ['Uma frase pode mudar de sentido quando é retirada do contexto. Procure a declaração completa e a situação em que ela foi feita.'] },
      { title: '6. Imagem verdadeira em contexto falso', paragraphs: ['Uma foto ou vídeo pode ser real, mas estar sendo usado para ilustrar outro evento, cidade ou período.'] },
      { title: '7. Autoridade inadequada', paragraphs: ['Uma pessoa pode ser especialista em uma área e não em outra. Avalie se a fonte tem conhecimento e responsabilidade sobre o assunto tratado.'] },
      { title: '8. Pedido de compartilhamento imediato', paragraphs: ['Frases como “compartilhe antes que apaguem” ou “a mídia não mostra” podem ser usadas para pressionar a circulação sem checagem.'] },
      { title: 'A regra das três perguntas', bullets: ['Quem publicou?', 'Qual é a evidência?', 'Em que contexto isso aconteceu?'] },
    ],
    summary: ['Reconhecer sinais de desinformação é criar o hábito de pausar, perguntar e verificar antes de compartilhar.'],
  },
]

export const educationManualBySlug = (slug: string | undefined) =>
  educationManuals.find((manual) => manual.slug === slug)
