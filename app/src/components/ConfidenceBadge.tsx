import { useState } from 'react'
import type { ConfidenceLevel } from '../types'
import Icon from './Icon'

interface Props {
  level?: ConfidenceLevel
  explanation?: string
}

const config: Record<ConfidenceLevel, { label: string; tone: string; desc: string }> = {
  alta: {
    label: 'Robustez alta',
    tone: 'confidence--high',
    desc: 'Análise sustentada por múltiplos registros oficiais primários e atos normativos publicados.',
  },
  media: {
    label: 'Robustez média',
    tone: 'confidence--medium',
    desc: 'Evidências oficiais parciais ou dependentes de atualização recente nos órgãos públicos.',
  },
  baixa: {
    label: 'Robustez baixa',
    tone: 'confidence--low',
    desc: 'Poucos registros oficiais disponíveis ou limitações documentais temporárias para o tema.',
  },
}

export default function ConfidenceBadge({ level = 'alta', explanation }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const item = config[level]

  return (
    <div className={`confidence-wrap ${item.tone}`}>
      <div
        className="confidence-badge"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((s) => !s)}
        role="button"
        tabIndex={0}
        aria-describedby="confidence-tip"
        aria-label={`Grau de robustez das evidências: ${item.label}`}
      >
        <span className="confidence-badge__dot" aria-hidden="true" />
        <span className="confidence-badge__label">{item.label}</span>
        <Icon name="info" size={14} className="confidence-badge__info" />
      </div>

      {showTooltip && (
        <div id="confidence-tip" className="confidence-tooltip" role="tooltip">
          <p className="confidence-tooltip__text">
            <strong>Qualidade das evidências: </strong>
            {explanation || item.desc}
          </p>
          <p className="confidence-tooltip__disclaimer">
            Este indicador representa a qualidade e a consistência das evidências disponíveis, não uma certeza absoluta sobre a informação.
          </p>
        </div>
      )}
    </div>
  )
}
