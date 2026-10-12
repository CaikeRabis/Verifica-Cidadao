import { useEffect, useState } from 'react'
import Icon from './Icon'
import Button from './Button'

const stages = [
  'Lendo a informação enviada',
  'Separando afirmações verificáveis',
  'Consultando fontes oficiais',
  'Preparando a análise',
]

export function LoadingState() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__row">
        <span className="spinner" />
        <div>
          <h3>Verificando…</h3>
          <p style={{ fontSize: '0.92rem' }}>Isso leva apenas alguns instantes.</p>
        </div>
      </div>
      <ul className="loading__stages">
        {stages.map((label, i) => (
          <li key={label} className={`stage ${i < stage ? 'is-done' : i === stage ? 'is-active' : ''}`}>
            <span className="stage__dot">{i < stage && <Icon name="check" size={13} strokeWidth={3.2} />}</span>
            {label}
          </li>
        ))}
      </ul>
      <div className="skeleton" style={{ width: '90%' }} />
      <div className="skeleton" style={{ width: '70%' }} />
    </div>
  )
}

export function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <div className="state" role="status">
      <span className="state__icon">
        <Icon name="search" size={30} />
      </span>
      <h3>Digite algo para verificar</h3>
      <p>Cole um texto, uma afirmação ou um link no campo acima. Você também pode testar com um exemplo.</p>
      <div className="state__actions">
        <Button variant="outline" onClick={onExample}>
          Usar um exemplo
        </Button>
      </div>
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon">
        <Icon name="alert" size={30} />
      </span>
      <h3>Não foi possível concluir a verificação</h3>
      <p>
        Tivemos um problema ao consultar as fontes. Isso não é um resultado sobre a sua informação. Tente novamente em
        instantes.
      </p>
      <div className="state__actions">
        <Button onClick={onRetry} id="btn-tentar-novamente">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
