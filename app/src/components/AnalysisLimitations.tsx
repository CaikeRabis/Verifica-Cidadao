import Icon from './Icon'

interface Props {
  limitations?: string[]
}

export default function AnalysisLimitations({ limitations }: Props) {
  if (!limitations || limitations.length === 0) {
    return null
  }

  return (
    <div className="analysis-limitations" role="note" aria-labelledby="limitations-heading">
      <div className="analysis-limitations__head">
        <Icon name="alert" size={20} className="analysis-limitations__icon" />
        <h5 id="limitations-heading">Limitações desta análise específica</h5>
      </div>
      <p className="analysis-limitations__intro">
        Para total transparência com o cidadão, apontamos as seguintes ressalvas operacionais encontradas durante esta consulta:
      </p>
      <ul className="analysis-limitations__list">
        {limitations.map((item, index) => (
          <li key={index} className="analysis-limitations__item">
            <span className="analysis-limitations__bullet" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
