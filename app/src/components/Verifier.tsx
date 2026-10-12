import { useId, useRef, useState, type FormEvent } from 'react'
import { useVerification } from '../hooks/useVerification'
import { classificationOrder, classifications } from '../data/classifications'
import { exampleQueries } from '../data/mockResults'
import type { Classification } from '../types'
import Button from './Button'
import Icon from './Icon'
import ResultCard from './ResultCard'
import { EmptyState, ErrorState, LoadingState } from './States'

const dotColor: Record<Classification, string> = {
  confirmada: 'var(--cl-confirmada)',
  'parcialmente-confirmada': 'var(--cl-parcial)',
  'sem-evidencias': 'var(--cl-sem-evidencias)',
  contradita: 'var(--cl-contradita)',
  'analise-humana': 'var(--cl-humana)',
}

/**
 * Campo de busca + área de resultado. Toda a lógica de verificação é mock
 * (ver services/verificationService.ts).
 */
export default function Verifier() {
  const [query, setQuery] = useState('')
  const { status, result, lastQuery, verify, reset } = useVerification()
  const inputRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const hintId = useId()

  const run = (text: string, forced?: Classification) => {
    verify(text, forced)
    requestAnimationFrame(() => areaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    run(query)
  }

  const useExample = () => {
    const ex = exampleQueries[0].query
    setQuery(ex)
    inputRef.current?.focus()
  }

  const newCheck = () => {
    reset()
    setQuery('')
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const isEmpty = status === 'empty'
  const loading = status === 'loading'

  return (
    <>
      <form onSubmit={onSubmit} role="search" aria-label="Verificar informação">
        <div className={`search ${isEmpty ? 'search--error' : ''}`}>
          <label className="search__field">
            <Icon name="search" size={22} />
            <span className="sr-only">O que você deseja verificar?</span>
            <input
              ref={inputRef}
              id="campo-verificar"
              className="search__input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você deseja verificar?"
              aria-describedby={hintId}
              aria-invalid={isEmpty}
              autoComplete="off"
              disabled={loading}
            />
          </label>
          <Button type="submit" id="btn-verificar" disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar informação'}
            {!loading && <Icon name="arrow" size={20} />}
          </Button>
        </div>
        <p id={hintId} className={`search__hint ${isEmpty ? 'search__hint--error' : ''}`}>
          {isEmpty
            ? 'Digite um texto, uma afirmação ou um link para continuar.'
            : 'Você pode informar um texto, uma afirmação ou um link.'}
        </p>
      </form>

      {status === 'idle' && (
        <div className="chips" aria-label="Exemplos">
          <span className="chips__label">Experimente:</span>
          {exampleQueries.map((ex) => (
            <button key={ex.label} type="button" className="chip" onClick={() => setQuery(ex.query)}>
              {ex.label}
            </button>
          ))}
        </div>
      )}

      <div ref={areaRef} style={{ scrollMarginTop: 96 }} aria-live="polite">
        {status !== 'idle' && (
          <div style={{ marginTop: 'var(--sp-5)' }}>
            {loading && <LoadingState />}
            {status === 'success' && result && <ResultCard result={result} onNew={newCheck} />}
            {status === 'error' && <ErrorState onRetry={() => run(lastQuery)} />}
            {isEmpty && <EmptyState onExample={useExample} />}
          </div>
        )}
      </div>

      <div className="demo-panel" aria-label="Painel de demonstração">
        <p className="demo-panel__title">
          <Icon name="flask" size={18} /> Modo demonstração (dados simulados)
        </p>
        <p>Nenhuma IA é usada nesta fase. Escolha um estado para visualizar cada classificação:</p>
        <div className="chips">
          {classificationOrder.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              onClick={() => run(query.trim() || exampleQueries[0].query, c)}
              disabled={loading}
            >
              <span className="chip__dot" style={{ background: dotColor[c] }} />
              {classifications[c].short}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            onClick={() => run(`${query.trim() || exampleQueries[0].query} #erro`)}
            disabled={loading}
          >
            <span className="chip__dot" style={{ background: '#b3261e' }} />
            Simular erro
          </button>
        </div>
      </div>
    </>
  )
}
