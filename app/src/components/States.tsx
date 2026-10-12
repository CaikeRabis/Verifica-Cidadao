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

export function SourceUnavailableState({
  onRetry,
  sourceName = 'Portal da Transparência',
}: {
  onRetry: () => void
  sourceName?: string
}) {
  return (
    <div className="state state--warning" role="alert" aria-live="polite">
      <span className="state__icon state__icon--warning">
        <Icon name="shield" size={30} />
      </span>
      <h3>Fonte oficial temporariamente indisponível</h3>
      <p>
        A base pública consultada (<strong>{sourceName}</strong>) apresentou instabilidade ou não respondeu durante a
        checagem. Como o Verifica Cidadão prioriza a integridade e não emite pareceres sem confronto direto com dados
        oficiais, a análise foi suspensa temporariamente.
      </p>
      <div className="state__actions">
        <Button onClick={onRetry} id="btn-tentar-fonte">
          Tentar novamente
        </Button>
      </div>
      <p style={{ fontSize: '0.82rem', color: '#8591a0', marginTop: 4 }}>
        Você também pode consultar a página oficial diretamente para verificar a disponibilidade do serviço.
      </p>
    </div>
  )
}

export function UnsupportedFormatState({ onReset }: { onReset: () => void }) {
  return (
    <div className="state state--info" role="alert" aria-live="polite">
      <span className="state__icon state__icon--info">
        <Icon name="doc" size={30} />
      </span>
      <h3>Formato ou arquivo não suportado</h3>
      <p>
        O conteúdo informado não pôde ser lido pela plataforma (por exemplo: arquivos compactados, áudios, PDFs
        protegidos por senha ou links com barreira de acesso/login).
      </p>
      <div className="state__actions">
        <Button onClick={onReset} variant="outline" id="btn-reset-formato">
          Inserir como texto digitado
        </Button>
      </div>
      <p style={{ fontSize: '0.82rem', color: '#8591a0', marginTop: 4 }}>
        Nesta fase, utilize texto corrido, parágrafos de notícias ou mensagens de WhatsApp no campo de texto.
      </p>
    </div>
  )
}

