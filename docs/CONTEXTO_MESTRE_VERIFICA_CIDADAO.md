# CONTEXTO MESTRE — PROJETO VERIFICA CIDADÃO

> Documento de handoff para continuidade do desenvolvimento com outra IA/agente.
>  
> **Data de consolidação:** 09/10/2026  
> **Status:** projeto em fase inicial, com front-end base já parcialmente desenvolvido por outro agente.  
> **Observação importante:** este arquivo consolida o contexto conceitual, funcional, visual e as decisões já alinhadas. O relatório técnico do que já foi implementado no front-end deverá ser anexado junto a este documento para que a próxima IA continue exatamente do estado atual do código.

---

## 1. Nome do projeto

**VERIFICA CIDADÃO**

### Frase-síntese / slogan

**“Antes de acreditar. Antes de compartilhar. Verifique.”**

---

## 2. O que é o Verifica Cidadão

O **Verifica Cidadão** é uma plataforma digital baseada em Inteligência Artificial, concebida para apoiar cidadãos na:

- verificação responsável de informações;
- identificação de possíveis conteúdos enganosos;
- compreensão de dados públicos;
- consulta a fontes confiáveis;
- educação midiática;
- educação cidadã;
- transparência pública;
- controle social responsável.

O projeto **não deve ser tratado como um simples “detector de fake news”**.

A essência do produto está na combinação de três eixos:

**Inteligência Artificial + Transparência Pública + Educação Cidadã**

O sistema deve ajudar o usuário a encontrar evidências, compreender o contexto, consultar fontes e entender o grau de confirmação de uma informação.

---

## 3. Área temática e atuação inicial

### Área temática

Combate à corrupção, transparência, integridade e enfrentamento à desinformação.

### Eixos de atuação

- tecnologia;
- educação cidadã;
- transparência pública;
- controle social.

### Localidade inicial

**Águas Lindas de Goiás — GO**

A proposta é iniciar como projeto-piloto local, mas a arquitetura e a identidade devem ser preparadas para expansão para outros municípios e, futuramente, para alcance nacional.

Não restringir o nome, domínio, interface ou arquitetura do produto à cidade de Águas Lindas.

---

## 4. Público-alvo

O projeto é destinado principalmente a:

- cidadãos em geral;
- estudantes;
- jovens;
- professores;
- educadores;
- lideranças comunitárias;
- organizações sociais;
- associações;
- pesquisadores;
- comunicadores;
- servidores públicos;
- pessoas interessadas em transparência e participação social.

Deve haver atenção especial a usuários que possuam dificuldade para localizar, interpretar ou compreender informações públicas.

---

## 5. Problemas que o projeto pretende enfrentar

O projeto nasce de três problemas centrais:

1. **Disseminação de desinformação**, especialmente em redes sociais e ambientes digitais.
2. **Baixo conhecimento sobre mecanismos de transparência e controle social.**
3. **Dificuldade de interpretação de dados públicos**, documentos, contratos, despesas, portais governamentais e informações administrativas.

A plataforma deve contribuir para uma mudança de comportamento:

- antes de acreditar, verificar;
- antes de compartilhar, conferir;
- antes de acusar, buscar evidências.

---

## 6. Objetivo geral

Desenvolver uma ferramenta digital baseada em IA capaz de auxiliar cidadãos na:

- verificação de informações;
- compreensão de dados públicos;
- identificação de possíveis conteúdos desinformativos;
- educação cidadã;
- transparência;
- integridade;
- participação social.

---

## 7. Objetivos específicos

O projeto busca:

- facilitar o acesso a informações confiáveis;
- estimular a verificação antes do compartilhamento;
- desenvolver pensamento crítico e educação midiática;
- facilitar a compreensão de informações relacionadas à administração pública;
- incentivar o uso de fontes oficiais;
- ampliar o conhecimento sobre mecanismos de transparência;
- estimular o controle social responsável;
- auxiliar o cidadão na compreensão de contratos, despesas, licitações, empenhos e pagamentos públicos;
- identificar inconsistências que justifiquem análise adicional;
- evitar que suspeitas sejam apresentadas como fatos;
- fortalecer uma cultura de integridade, responsabilidade e participação cidadã.

---

## 8. Princípio fundamental: A IA NÃO ACUSA

Este é um dos princípios mais importantes do projeto e deve orientar arquitetura, prompts, interface, textos e regras do sistema.

A ferramenta **não deve transformar inconsistências em acusações**.

### Exemplo do que NÃO fazer

> “Esta empresa praticou corrupção.”

### Exemplo de comportamento esperado

> “Foram identificadas informações que apresentam divergências e que podem justificar uma verificação adicional. Consulte os documentos e os órgãos competentes.”

O sistema deve preservar:

- direito de defesa;
- presunção de inocência;
- responsabilidade na comunicação;
- necessidade de evidências;
- indicação clara de incertezas;
- encaminhamento para análise humana quando necessário.

O Verifica Cidadão:

- não substitui órgãos de controle;
- não substitui jornalistas;
- não substitui autoridades públicas;
- não substitui especialistas;
- não realiza investigação oficial;
- não deve emitir acusações automáticas.

---

## 9. Módulos previstos para o produto

O projeto completo foi concebido com quatro grandes módulos.

### 9.1. Verificador de Informações

É o núcleo inicial e deve ser priorizado no MVP.

O usuário poderá fornecer:

- texto;
- notícia;
- afirmação;
- link;
- imagem;
- documento.

Fluxo conceitual:

1. usuário envia uma informação;
2. sistema identifica afirmações verificáveis;
3. sistema busca fontes confiáveis;
4. evidências são organizadas;
5. usuário recebe uma análise;
6. fontes e grau de confirmação são exibidos.

### 9.2. Radar da Transparência

Deve futuramente facilitar a compreensão de dados públicos, incluindo:

- contratos;
- licitações;
- fornecedores;
- empenhos;
- pagamentos;
- despesas;
- obras;
- programas públicos;
- valores contratados;
- datas;
- órgãos responsáveis.

É uma área potencialmente complexa tecnicamente porque pode exigir integrações com múltiplas bases governamentais.

### 9.3. Antes de Compartilhar

Voltado especialmente para conteúdos recebidos em redes sociais e aplicativos de mensagens.

O sistema poderá analisar:

- afirmações sem fonte;
- informações fora de contexto;
- datas incompatíveis;
- números divergentes;
- ausência de evidências;
- sinais de manipulação;
- informações ainda não confirmadas.

A plataforma deve evitar afirmar categoricamente que um conteúdo é falso quando não houver evidências suficientes.

### 9.4. Educação Cidadã

Área educativa com conteúdos sobre:

- como consultar um Portal da Transparência;
- como identificar fontes confiáveis;
- como verificar informações;
- como interpretar empenho;
- diferença entre empenho, liquidação e pagamento;
- como acompanhar uma contratação pública;
- como reconhecer sinais de desinformação;
- como utilizar canais oficiais;
- como exercer controle social;
- como comunicar possíveis irregularidades aos órgãos competentes.

---

## 10. Sistema de classificação

O projeto já definiu cinco estados principais para o resultado das verificações:

### Confirmada

Existem evidências suficientes nas fontes consultadas que sustentam a informação.

### Parcialmente confirmada

Parte da informação encontra respaldo, mas existem elementos incompletos, imprecisos ou que precisam de contexto.

### Sem evidências suficientes

Não foram encontradas informações confiáveis suficientes para confirmar ou contradizer a afirmação.

### Contradita pelas fontes consultadas

As fontes confiáveis encontradas apresentam informações incompatíveis com a afirmação analisada.

### Necessita de análise humana

O caso é complexo, sensível ou possui informações insuficientes para uma conclusão automatizada segura.

Toda classificação deve vir acompanhada de:

- explicação;
- evidências relevantes;
- fontes utilizadas;
- contexto;
- limitações da análise.

---

## 11. Política de fontes

Sempre que tecnicamente possível, o sistema deve priorizar:

- portais oficiais;
- Portais da Transparência;
- Diários Oficiais;
- órgãos de controle;
- Tribunais de Contas;
- legislação oficial;
- bases públicas governamentais;
- documentos institucionais;
- fontes jornalísticas reconhecidas, quando apropriado.

A origem das informações utilizadas deve ser visível ao usuário.

A rastreabilidade das fontes é parte central da confiança no produto.

---

## 12. Segurança e responsabilidade

O projeto prevê mecanismos para reduzir riscos no uso da IA.

Entre os princípios esperados:

- identificação das fontes;
- registro das referências consultadas;
- indicação do grau de certeza;
- comunicação clara das limitações;
- proteção dos dados dos usuários;
- revisão humana em situações sensíveis;
- prevenção de acusações sem evidências;
- mecanismos de correção;
- atualização periódica das fontes;
- cuidado especial com dados pessoais e dados sensíveis;
- observância da legislação aplicável de proteção de dados.

---

## 13. Metodologia geral do projeto

A proposta institucional prevê uma evolução em etapas:

1. diagnóstico;
2. planejamento técnico;
3. desenvolvimento da plataforma;
4. produção de conteúdo;
5. testes internos;
6. projeto-piloto;
7. capacitação;
8. implementação;
9. monitoramento;
10. aperfeiçoamento;
11. avaliação de impacto;
12. expansão.

O produto não deve ser construído de forma monolítica ou tentando entregar todos os módulos simultaneamente.

---

## 14. Estratégia de desenvolvimento já alinhada

A decisão atual é começar de forma incremental.

### Primeira fase

Construir um **front-end base navegável**, visualmente consistente e fiel ao Manual da Marca.

Nesta fase:

- não implementar backend real;
- não implementar banco de dados;
- não implementar autenticação real;
- não integrar IA real;
- não conectar APIs externas;
- utilizar dados simulados/mocks;
- validar experiência, arquitetura de telas e identidade visual.

### Objetivo

Ter uma aplicação que pareça um produto real, e não apenas uma landing page.

---

## 15. Escopo inicialmente solicitado para o front-end

O front-end base deverá conter:

### Cabeçalho

- logotipo Verifica Cidadão;
- Início;
- Como funciona;
- Fontes;
- Educação Cidadã;
- Sobre;
- botão “Entrar” apenas visual, inicialmente.

### Hero principal

Slogan:

**“Antes de acreditar. Antes de compartilhar. Verifique.”**

Campo central:

**“O que você deseja verificar?”**

CTA:

**“Verificar informação”**

Nesta fase, o botão utiliza apenas dados mockados.

### Resultado simulado

O resultado deve conter:

- classificação;
- resumo da análise;
- explicação;
- fontes consultadas;
- data da análise;
- aviso sobre limitações da análise automatizada.

Deve ser possível visualizar os cinco estados do sistema.

### Fontes consultadas

Exemplos visuais utilizados no protótipo:

- Governo Federal;
- Portal da Transparência;
- Senado Federal;
- Câmara dos Deputados;
- Tribunais de Contas;
- Agência Brasil.

São apenas referências visuais nesta fase.

### Como funciona

Fluxo em quatro passos:

1. Envie uma informação.
2. A plataforma analisa.
3. Fontes são consultadas.
4. Você recebe uma análise.

### Cards dos quatro módulos

- Verificador de Informações;
- Radar da Transparência;
- Antes de Compartilhar;
- Educação Cidadã.

Inicialmente somente o Verificador deve parecer funcional.

Os demais podem aparecer como **“Em breve”**.

### Página Educação Cidadã

Criar estrutura visual com conteúdos futuros, sem necessidade de conteúdo completo nesta primeira fase.

### Rodapé

Incluir:

- Verifica Cidadão;
- Sobre;
- Fontes;
- Privacidade;
- Termos;
- Contato;
- placeholders para redes sociais;
- pequeno texto institucional.

---

## 16. Arquitetura inicialmente sugerida para o front-end

Stack proposta:

- React;
- TypeScript;
- Vite;
- React Router;
- CSS organizado e reutilizável.

Evitar bibliotecas desnecessárias nesta primeira etapa.

Estrutura conceitual sugerida:

```text
src/
├── components/
├── pages/
├── layouts/
├── styles/
├── data/
├── types/
└── assets/
```

Essa estrutura é uma referência, não uma obrigação se o agente já tiver criado uma arquitetura melhor e consistente.

**Não refatorar desnecessariamente um front-end já existente apenas para encaixar nesta sugestão.**

Primeiro analisar o código atual.

---

## 17. Identidade visual

Existe um **Manual da Marca oficial do Verifica Cidadão**, com identidade visual já estabelecida.

A próxima IA deve utilizá-lo como referência principal.

### Paleta oficial

- Azul principal: `#0B4EA2`
- Azul apoio: `#1C73D1`
- Verde verificação: `#19A866`
- Amarelo destaque: `#F3CA31`
- Cinza grafite: `#404A57`
- Cinza claro: `#E9EDF2`
- Branco: `#FFFFFF`

### Tipografia sugerida pelo manual

**Títulos e destaques**

Montserrat Bold

**Textos e interface**

Inter Regular / Semibold

### Linguagem visual

A marca utiliza:

- cantos arredondados;
- cards;
- espaços amplos;
- ícones simples;
- linhas suaves;
- hierarquia clara;
- visual moderno;
- acessibilidade;
- comunicação institucional sem aparência burocrática;
- proximidade com o cidadão.

---

## 18. Significados do símbolo da marca

A identidade visual utiliza diferentes elementos com significados específicos:

### Lupa

Representa:

- busca;
- análise;
- verificação;
- exame das informações.

### Check

Representa:

- validação;
- confirmação;
- confiabilidade dos dados.

### Prédio cívico

Representa:

- instituições públicas;
- interesse público;
- cidadania.

### Documento / balão

Representa:

- dados;
- conteúdo;
- diálogo com o cidadão.

A marca não deve ser descaracterizada.

---

## 19. Regras básicas da marca

Manter:

- proporções;
- cores oficiais;
- legibilidade;
- área de proteção;
- integridade visual.

Evitar:

- distorção da marca;
- alteração arbitrária de cores;
- aplicação sobre fundos que comprometam a leitura;
- separação indevida dos elementos;
- versões não previstas sem necessidade.

---

## 20. Diretrizes de UX e acessibilidade

A experiência deve priorizar:

- clareza da linguagem;
- contraste e legibilidade;
- hierarquia visual;
- feedback imediato ao usuário;
- consistência;
- responsividade;
- navegação simples;
- textos curtos;
- fontes visíveis;
- botões claros;
- linguagem cidadã.

A aplicação deve funcionar adequadamente em:

- desktop;
- tablet;
- celular.

---

## 21. Estados de interface importantes

Mesmo antes da IA real, é desejável prever visualmente:

- estado inicial;
- carregamento;
- sucesso;
- erro;
- ausência de resultado;
- ausência de evidências;
- necessidade de análise humana;
- fonte indisponível;
- conteúdo não suportado.

Esses estados podem inicialmente funcionar com mocks.

---

## 22. Filosofia de produto

O Verifica Cidadão deve transmitir:

- confiança;
- transparência;
- responsabilidade;
- neutralidade;
- clareza;
- segurança;
- utilidade pública;
- cidadania.

Evitar uma experiência sensacionalista.

Evitar linguagem como:

- “PEGAMOS A MENTIRA”;
- “FAKE!”;
- “DESMASCARAMOS”;
- “CORRUPÇÃO DETECTADA”.

Preferir linguagem baseada em evidências:

- “As fontes consultadas indicam...”
- “Não foram encontradas evidências suficientes...”
- “Há divergências entre a afirmação e as fontes consultadas...”
- “Este caso necessita de análise humana.”
- “Consulte as evidências abaixo.”

---

## 23. O que NÃO fazer neste momento

Até nova decisão, evitar:

- implementar IA real sem planejamento;
- criar banco de dados prematuramente;
- construir autenticação completa;
- integrar dezenas de APIs;
- tentar implementar o Radar da Transparência inteiro;
- desenvolver os quatro módulos simultaneamente;
- mudar a identidade visual;
- transformar o produto em uma landing page genérica;
- transformar o produto em um simples detector de fake news;
- construir uma arquitetura excessivamente complexa antes de validar UX;
- criar acusações ou conclusões absolutas em casos sensíveis.

---

## 24. Roadmap conceitual recomendado

### Fase 1 — Front-end base

- identidade visual;
- rotas;
- componentes;
- experiência principal;
- mock de verificação;
- estados;
- responsividade;
- acessibilidade inicial.

### Fase 2 — Refinamento UX

- testes visuais;
- revisão das jornadas;
- revisão de linguagem;
- melhorias mobile;
- loading;
- erros;
- estados intermediários.

### Fase 3 — Arquitetura do MVP real

Definir:

- backend;
- modelo de dados;
- APIs;
- provedor(es) de IA;
- mecanismo de busca;
- políticas de fontes;
- rastreabilidade;
- logs;
- segurança.

### Fase 4 — Verificador real

Implementar somente o núcleo:

entrada → identificação de alegações → busca → evidências → classificação → resposta.

### Fase 5 — Testes controlados

- acurácia;
- fontes;
- segurança;
- casos sensíveis;
- alucinações;
- respostas inconclusivas;
- UX.

### Fase 6 — Piloto

Começar com grupo limitado de usuários.

### Fases posteriores

- Antes de Compartilhar;
- Educação Cidadã ampliada;
- Radar da Transparência;
- expansão municipal/regional/nacional.

---

## 25. Domínio e presença digital

A preferência conceitual levantada foi manter o nome **Verifica Cidadão** como marca principal.

Possíveis domínios discutidos:

1. `verificacidadao.org.br`
2. `verificacidadao.com.br`
3. `verificacidadao.org`
4. `verificacidadao.com`
5. `verificacidadao.ai`
6. `verificacidadao.app`
7. `cidadaoverifica.org.br`
8. `verificacidadania.org.br`
9. `antesdecompartilhar.org.br`
10. `verificabrasil.org.br`

Preferência conceitual inicial:

**verificacidadao.org.br**

Ainda é necessário verificar disponibilidade real antes da compra.

---

## 26. Situação atual do desenvolvimento

O front-end **já começou a ser desenvolvido por outro agente**.

Este documento **não contém detalhes do código já criado**, porque esses detalhes serão fornecidos em um segundo documento/relatório produzido pelo agente responsável pelo desenvolvimento atual.

Portanto, a próxima IA deverá receber:

1. este arquivo de contexto;
2. o Manual da Marca;
3. o documento original do projeto;
4. o relatório técnico do front-end já implementado;
5. preferencialmente o repositório ou ZIP atual do código.

---

## 27. Instrução essencial para a próxima IA

Ao receber este contexto:

### PRIMEIRO

Leia integralmente:

- este documento;
- documento-base do projeto;
- Manual da Marca;
- relatório técnico da implementação atual.

### DEPOIS

Inspecione o código real antes de propor mudanças.

### NÃO FAÇA

- reconstrução do projeto do zero sem necessidade;
- troca de stack sem justificativa;
- refatoração extensa por preferência pessoal;
- descaracterização da marca;
- implementação de backend sem autorização;
- alteração da proposta conceitual.

### FAÇA

- preserve o que já funciona;
- identifique claramente o estado atual;
- compare implementação x requisitos;
- liste lacunas;
- proponha pequenas tasks incrementais;
- mantenha cada etapa testável;
- documente decisões importantes.

---

## 28. Primeira tarefa recomendada para a IA que receber o projeto

A primeira resposta da nova IA deveria produzir uma **auditoria curta do estado atual**, contendo:

1. stack real encontrada;
2. estrutura do projeto;
3. páginas existentes;
4. rotas existentes;
5. componentes existentes;
6. identidade visual já aplicada;
7. funcionalidades mockadas existentes;
8. responsividade atual;
9. divergências em relação ao Manual da Marca;
10. divergências em relação ao escopo do MVP;
11. bugs ou riscos visíveis;
12. próxima task recomendada.

Não modificar código antes de entender claramente o estado atual, salvo se solicitado.

---

## 29. Critério para considerar a primeira versão de front-end satisfatória

A primeira versão estará pronta para avançar quando:

- parecer visualmente um produto real;
- identidade visual estiver consistente;
- navegação estiver funcional;
- fluxo principal puder ser demonstrado;
- resultados mockados estiverem claros;
- cinco classificações puderem ser visualizadas;
- fontes estiverem visíveis;
- mensagens de responsabilidade estiverem presentes;
- mobile estiver funcional;
- estados de loading/erro/vazio estiverem minimamente previstos;
- interface puder ser apresentada a terceiros sem parecer um rascunho técnico.

---

## 30. Princípio de continuidade

O projeto deve evoluir em **tasks pequenas, auditáveis e reversíveis**.

Evitar grandes implementações em um único passo.

Fluxo recomendado:

**analisar → planejar → implementar → testar → revisar → documentar → avançar**

---

## 31. Documentos-base originais

Os dois documentos originais que deram origem a este contexto são:

- **Projeto - 02.docx**
- **MANUAL DA MARCA.pdf**

Eles devem acompanhar este arquivo sempre que possível.

Este `.md` é um documento de contexto e handoff, não substitui os arquivos originais.

---

## 32. Resumo executivo para uma IA

Se você é a IA que está recebendo este arquivo, considere o seguinte como orientação central:

> O Verifica Cidadão é uma plataforma de cidadania digital baseada em IA, transparência pública e educação cidadã. Seu objetivo não é apenas dizer se algo é verdadeiro ou falso, mas ajudar pessoas a investigar informações, compreender evidências e localizar fontes confiáveis. O princípio mais importante é que a IA não acusa e não substitui instituições ou profissionais. O desenvolvimento está começando pelo front-end e pelo Verificador de Informações. O projeto já possui identidade visual definida. Preserve a arquitetura existente, avalie o código antes de alterar qualquer coisa e avance em pequenas tasks, sem implementar backend ou IA real até autorização explícita.

---

**Fim do documento de contexto.**

---

## Nota de validação da v0.2

- O *golden set* é a regressão lógica controlada do pipeline; a bateria real mede comportamento externo.
- A bateria real passou a ter 11 casos. O antigo cenário de datas de obra foi removido porque não identificava obra, órgão, documentos ou fontes: media ausência de contexto, não conflito documental.
- O conflito documental permanece coberto por fixture sintética controlada, com Documento A e Documento B identificados e datas divergentes.
- DuckDuckGo é o provider principal atual. Brave Search está integrado e disponível, mas não é o padrão.
- Busca e leitura externas continuam sujeitas a variação de disponibilidade e conteúdo das fontes.
