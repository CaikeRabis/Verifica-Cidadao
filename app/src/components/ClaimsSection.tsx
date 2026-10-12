import type { Claim } from '../types'
import Icon from './Icon'

interface Props {
  claims?: Claim[]
}

const statusBadge: Record<string, { label: string; className: string }> = {
  confirmada: { label: 'Confirmada', className: 'claim-badge--confirmed' },
  'parcialmente-confirmada': { label: 'Parcial', className: 'claim-badge--partial' },
  'sem-evidencias': { label: 'Sem evidências', className: 'claim-badge--no-evidence' },
  contradita: { label: 'Divergente', className: 'claim-badge--contradicted' },
  'analise-humana': { label: 'Em aberto', className: 'claim-badge--human' },
  verificada: { label: 'Verificada', className: 'claim-badge--verified' },
}

export default function ClaimsSection({ claims }: Props) {
  if (!claims || claims.length === 0) {
    return null
  }

  const isMultiple = claims.length > 1

  return (
    <section className="result__section result__section--claims" aria-labelledby="claims-title">
      <div className="claims-head">
        <h4 id="claims-title">O que foi verificado</h4>
        <p className="claims-subtitle">
          {isMultiple
            ? 'Identificamos mais de uma afirmação verificável no texto. Cada uma foi analisada individualmente com fontes oficiais:'
            : 'Identificamos a seguinte afirmação verificável para confronto com fontes públicas:'}
        </p>
      </div>

      <div className="claims-list">
        {claims.map((claim, index) => {
          const badge = claim.status ? statusBadge[claim.status] : undefined

          return (
            <div key={claim.id || index} className="claim-item">
              <div className="claim-item__num" aria-hidden="true">
                <Icon name="check" size={14} />
                <span>Afirmação {index + 1}</span>
              </div>
              <p className="claim-item__text">“{claim.text}”</p>
              {(claim.statusLabel || badge) && (
                <span className={`claim-badge ${badge ? badge.className : ''}`}>
                  {claim.statusLabel || badge?.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
