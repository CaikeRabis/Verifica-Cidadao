import type { VerificationResult } from '../types'
import { classifications } from '../data/classifications'
import { limitationsText } from '../data/content'
import { ClassificationIcon } from './ClassificationBadge'
import SourceCard from './SourceCard'
import EvidenceList from './EvidenceList'
import ClaimsSection from './ClaimsSection'
import ConfidenceBadge from './ConfidenceBadge'
import AnalysisLimitations from './AnalysisLimitations'
import HumanAnalysisGuide from './HumanAnalysisGuide'
import Button from './Button'
import Icon from './Icon'

interface Props {
  result: VerificationResult
  onNew: () => void
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

export default function ResultCard({ result, onNew }: Props) {
  const meta = classifications[result.classification]
  return (
    <article className={`cl result cl--${result.classification}`} aria-labelledby="result-title">
      <header className="result__head">
        <ClassificationIcon value={result.classification} large />
        <div className="result__head-info">
          <p className="result__label">Resultado da verificação</p>
          <h3 className="result__title" id="result-title">
            {meta.label}
          </h3>
        </div>
        {result.confidence && (
          <div className="result__head-confidence">
            <ConfidenceBadge
              level={result.confidence}
              explanation={result.confidenceExplanation}
            />
          </div>
        )}
      </header>

      <div className="result__body">
        {/* 1. Afirmação analisada */}
        <section className="result__section">
          <h4>Afirmação analisada</h4>
          <p className="result__query">“{result.query}”</p>
        </section>

        {/* 2. Resumo da análise */}
        <section className="result__section">
          <h4>Resumo da análise</h4>
          <p className="result__summary">{result.summary}</p>
        </section>

        {/* 3. O que foi verificado (Claims identificadas) */}
        {result.claims && result.claims.length > 0 && (
          <ClaimsSection claims={result.claims} />
        )}

        {/* 4. Evidências encontradas */}
        {result.evidences && result.evidences.length > 0 && (
          <section className="result__section">
            <h4>Evidências encontradas</h4>
            <EvidenceList evidences={result.evidences} claims={result.claims} />
          </section>
        )}

        {/* 5. Explicação e contexto */}
        <section className="result__section">
          <h4>Explicação e contexto</h4>
          <p>{result.explanation}</p>
          <p style={{ marginTop: 8, fontSize: '0.92rem' }}>
            <strong>O que esta classificação significa:</strong> {meta.description}
          </p>
        </section>

        {/* 6. Guia orientador para Necessita de análise humana */}
        {result.classification === 'analise-humana' && (
          <section className="result__section">
            <HumanAnalysisGuide />
          </section>
        )}

        {/* 7. Limitações específicas desta consulta */}
        {result.limitations && result.limitations.length > 0 && (
          <AnalysisLimitations limitations={result.limitations} />
        )}

        {/* 8. Fontes consultadas (efetivamente lidas) */}
        {(() => {
          const consulted = result.sources.filter((s) => !s.readStatus || s.readStatus === 'read')
          const unread = result.sources.filter((s) => s.readStatus && s.readStatus !== 'read')
          return (
            <>
              {consulted.length > 0 && (
                <section className="result__section">
                  <h4>Fontes consultadas</h4>
                  <div className="sources-grid">
                    {consulted.map((s) => (
                      <SourceCard key={s.id} source={s} />
                    ))}
                  </div>
                </section>
              )}
              {unread.length > 0 && (
                <section className="result__section">
                  <h4>Outras páginas retornadas na busca (não lidas / não utilizadas)</h4>
                  <p style={{ fontSize: '0.88rem', color: '#5b6675', marginBottom: 10 }}>
                    As páginas abaixo foram listadas pelo buscador, mas não puderam ser abertas ou apresentavam apenas resumo. Por transparência, não foram consideradas como evidência.
                  </p>
                  <div className="sources-grid">
                    {unread.map((s) => (
                      <SourceCard key={s.id} source={s} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        })()}

        <p className="result__meta">
          <Icon name="calendar" size={18} />
          Análise realizada em <time dateTime={result.analyzedAt}>{formatDate(result.analyzedAt)}</time>
        </p>

        <div className="limitations" role="note">
          <Icon name="info" size={20} />
          <p>
            <strong>Limitações da análise automatizada. </strong>
            {limitationsText}
          </p>
        </div>

        <div className="result__foot">
          <Button variant="outline" onClick={onNew} id="btn-nova-verificacao">
            <Icon name="search" size={18} /> Nova verificação
          </Button>
          <Button variant="ghost" to="/educacao-cidada">
            <Icon name="book" size={18} /> Aprender a verificar
          </Button>
        </div>
      </div>
    </article>
  )
}
