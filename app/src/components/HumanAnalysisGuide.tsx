import Icon from './Icon'

export default function HumanAnalysisGuide() {
  return (
    <div className="human-guide" role="region" aria-labelledby="human-guide-title">
      <div className="human-guide__head">
        <div className="human-guide__icon" aria-hidden="true">
          <Icon name="doc" size={24} />
        </div>
        <div>
          <h4 id="human-guide-title">Como o cidadão pode avançar neste caso</h4>
          <p className="human-guide__subtitle">
            Quando um caso envolve interpretação jurídica, cláusulas complexas ou dados em atualização, a análise automatizada não deve tirar conclusões precipitadas. Você pode buscar esclarecimentos oficiais pelos seguintes canais públicos:
          </p>
        </div>
      </div>

      <div className="human-guide__grid">
        <div className="human-guide__card">
          <div className="human-guide__card-head">
            <Icon name="shield" size={18} />
            <h5>Fala.BR / e-SIC</h5>
          </div>
          <p>
            Plataforma Integrada de Ouvidoria e Acesso à Informação. Permite registrar pedidos de informação com base na <strong>Lei de Acesso à Informação (Lei nº 12.527/2011)</strong> e obter cópias integrais de processos ou contratos.
          </p>
          <span className="human-guide__tag">Serviço de Informação ao Cidadão</span>
        </div>

        <div className="human-guide__card">
          <div className="human-guide__card-head">
            <Icon name="info" size={18} />
            <h5>Ouvidoria do Órgão</h5>
          </div>
          <p>
            Canal institucional para solicitar providências, tirar dúvidas sobre serviços públicos ou comunicar eventuais divergências encontradas em portais municipais ou estaduais.
          </p>
          <span className="human-guide__tag">Atendimento oficial</span>
        </div>

        <div className="human-guide__card">
          <div className="human-guide__card-head">
            <Icon name="doc" size={18} />
            <h5>Diário Oficial e Processos</h5>
          </div>
          <p>
            Acompanhe as publicações de termos aditivos, editais de licitação e pareceres dos Tribunais de Contas nos diários oficiais do município ou do estado.
          </p>
          <span className="human-guide__tag">Transparência ativa</span>
        </div>
      </div>
    </div>
  )
}
