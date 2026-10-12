import type { VerificationResult } from '../types'
import { classifications } from '../data/classifications'
import { limitationsText } from '../data/content'
import { ClassificationIcon } from './ClassificationBadge'
import SourceCard from './SourceCard'
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
        <div>
          <p className="result__label">Resultado da verificação</p>
          <h3 className="result__title" id="result-title">
            {meta.label}
          </h3>
        </div>
      </header>

      <div className="result__body">
        <section className="result__section">
          <h4>Informação analisada</h4>
          <p className="result__query">“{result.query}”</p>
        </section>

        <section className="result__section">
          <h4>Resumo da análise</h4>
          <p className="result__summary">{result.summary}</p>
        </section>

        <section className="result__section">
          <h4>Explicação</h4>
          <p>{result.explanation}</p>
          <p style={{ marginTop: 8, fontSize: '0.92rem' }}>
            <strong>O que esta classificação significa:</strong> {meta.description}
          </p>
        </section>

        <section className="result__section">
          <h4>Fontes consultadas</h4>
          <div className="sources-grid">
            {result.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
        </section>

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
