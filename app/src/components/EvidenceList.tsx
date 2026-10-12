import type { Evidence } from '../types'
import { sources } from '../data/sources'
import Icon from './Icon'

interface Props {
  evidences?: Evidence[]
}

export default function EvidenceList({ evidences }: Props) {
  if (!evidences || evidences.length === 0) {
    return null
  }

  return (
    <div className="evidences" aria-label="Lista de evidências encontradas">
      <div className="evidences__list">
        {evidences.map((ev, index) => {
          const matchedSource = ev.sourceId
            ? sources.find((s) => s.id === ev.sourceId)
            : undefined

          const hasComparison = Boolean(ev.allegedValue && ev.foundValue)

          return (
            <article key={ev.id || index} className="evidence-card">
              <header className="evidence-card__head">
                <div className="evidence-card__title-wrap">
                  <span className="evidence-card__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h5 className="evidence-card__title">{ev.title}</h5>
                    {ev.badge && <span className="evidence-card__badge">{ev.badge}</span>}
                  </div>
                </div>

                {ev.date && (
                  <span className="evidence-card__date">
                    <Icon name="calendar" size={15} />
                    {ev.date}
                  </span>
                )}
              </header>

              {ev.description && (
                <p className="evidence-card__desc">{ev.description}</p>
              )}

              {/* Bloco de comparação visual quando há confronto de valores */}
              {hasComparison && (
                <div className="comparison" role="region" aria-label="Comparação de valores">
                  <div className="comparison__item comparison__item--alleged">
                    <span className="comparison__label">
                      <Icon name="alert" size={16} /> O que foi afirmado
                    </span>
                    <strong className="comparison__value">{ev.allegedValue}</strong>
                  </div>

                  <div className="comparison__divider" aria-hidden="true">
                    <span>vs</span>
                  </div>

                  <div className="comparison__item comparison__item--found">
                    <span className="comparison__label">
                      <Icon name="check" size={16} /> Dado oficial localizado
                    </span>
                    <strong className="comparison__value">{ev.foundValue}</strong>
                  </div>
                </div>
              )}

              {/* Citação textual ou extrato documental */}
              {ev.quote && (
                <div className="evidence-card__quote">
                  <Icon name="doc" size={18} className="evidence-card__quote-icon" />
                  <blockquote>{ev.quote}</blockquote>
                </div>
              )}

              {/* Observação de contexto */}
              {ev.context && (
                <p className="evidence-card__context">
                  <strong>Contexto: </strong>
                  {ev.context}
                </p>
              )}

              {/* Rastreabilidade e fonte vinculada */}
              {(ev.sourceName || matchedSource) && (
                <footer className="evidence-card__foot">
                  <span className="evidence-card__source-label">Origem da evidência:</span>
                  {matchedSource ? (
                    <a
                      href={ev.sourceUrl || matchedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-card__source-link"
                      aria-label={`${matchedSource.name} (abre em nova aba)`}
                    >
                      <Icon name="shield" size={15} />
                      <strong>{ev.sourceName || matchedSource.name}</strong>
                      <span className="evidence-card__domain">({matchedSource.domain})</span>
                      <Icon name="external" size={14} />
                    </a>
                  ) : (
                    <span className="evidence-card__source-text">
                      <Icon name="shield" size={15} />
                      <strong>{ev.sourceName}</strong>
                    </span>
                  )}
                </footer>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
