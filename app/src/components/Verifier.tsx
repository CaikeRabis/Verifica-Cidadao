import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useVerification } from '../hooks/useVerification'
import { classificationOrder, classifications } from '../data/classifications'
import { exampleQueries } from '../data/mockResults'
import type { Classification } from '../types'
import Button from './Button'
import Icon from './Icon'
import ResultCard from './ResultCard'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SourceUnavailableState,
  UnsupportedFormatState,
} from './States'

type InputMode = 'text' | 'link' | 'file'

const dotColor: Record<Classification, string> = {
  confirmada: 'var(--cl-confirmada)',
  'parcialmente-confirmada': 'var(--cl-parcial)',
  'sem-evidencias': 'var(--cl-sem-evidencias)',
  contradita: 'var(--cl-contradita)',
  'analise-humana': 'var(--cl-humana)',
}

/**
 * Verifier: Campo de entrada com suporte a textos longos (textarea expansível)
 * e seletor de modo (Texto / Link / Arquivo).
 */
export default function Verifier() {
  const [mode, setMode] = useState<InputMode>('text')
  const [query, setQuery] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const { status, result, lastQuery, unavailableSourceName, verify, reset } = useVerification()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const hintId = useId()

  // Ajusta a altura do textarea automaticamente conforme o conteúdo
  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const nextHeight = Math.min(Math.max(el.scrollHeight, 64), 260)
    el.style.height = `${nextHeight}px`
  }

  useEffect(() => {
    if (mode === 'text') {
      adjustHeight()
    }
  }, [query, mode])

  const run = (text: string, forced?: Classification, inputType: 'text' | 'url' = 'text') => {
    verify(text, forced, inputType)
    requestAnimationFrame(() =>
      areaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'text') {
      run(query)
    } else if (mode === 'link') {
      if (!linkInput.trim()) {
        run('')
      } else {
        try {
          const parsed = new URL(linkInput.trim())
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo')
          run(parsed.toString(), undefined, 'url')
        } catch {
          run('')
        }
      }
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Permite enviar com Ctrl+Enter ou Cmd+Enter para agilidade
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      run(query)
    }
  }

  const useExample = (q?: string) => {
    const textToUse = q ?? exampleQueries[0].query
    setMode('text')
    setQuery(textToUse)
    setTimeout(() => {
      textareaRef.current?.focus()
      adjustHeight()
    }, 50)
  }

  const newCheck = () => {
    reset()
    setQuery('')
    setLinkInput('')
    setMode('text')
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const clearQuery = () => {
    setQuery('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '64px'
      textareaRef.current.focus()
    }
  }

  const isEmpty = status === 'empty'
  const loading = status === 'loading'

  return (
    <div className="verifier-box">
      {/* Seletor visual de modos */}
      <div className="verifier-modes" role="tablist" aria-label="Modo de verificação">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={`verifier-mode-btn ${mode === 'text' ? 'is-active' : ''}`}
          onClick={() => setMode('text')}
        >
          <Icon name="doc" size={17} />
          <span>Texto ou afirmação</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'link'}
          className={`verifier-mode-btn ${mode === 'link' ? 'is-active' : ''}`}
          onClick={() => setMode('link')}
        >
          <Icon name="external" size={16} />
          <span>Link da web</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={`verifier-mode-btn ${mode === 'file' ? 'is-active' : ''}`}
          onClick={() => setMode('file')}
        >
          <Icon name="shield" size={16} />
          <span>Arquivo ou imagem</span>
          <span className="mode-pill">Demonstrativo</span>
        </button>
      </div>

      {/* Formulário do modo Texto */}
      {mode === 'text' && (
        <form onSubmit={onSubmit} role="search" aria-label="Verificar texto ou afirmação">
          <div className={`search search--textarea ${isEmpty ? 'search--error' : ''}`}>
            <div className="search__textarea-wrap">
              <label htmlFor="campo-verificar" className="sr-only">
                O que você deseja verificar?
              </label>
              <textarea
                ref={textareaRef}
                id="campo-verificar"
                className="search__textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Cole aqui uma afirmação, notícia curta, mensagem de WhatsApp ou texto que deseja verificar com base em dados oficiais..."
                aria-describedby={hintId}
                aria-invalid={isEmpty}
                rows={2}
                disabled={loading}
              />
              {query && !loading && (
                <button
                  type="button"
                  className="search__clear"
                  onClick={clearQuery}
                  aria-label="Limpar campo de texto"
                  title="Limpar campo"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            <div className="search__actions">
              <Button type="submit" id="btn-verificar" disabled={loading}>
                {loading ? 'Verificando…' : 'Verificar informação'}
                {!loading && <Icon name="arrow" size={20} />}
              </Button>
            </div>
          </div>

          <div className="search__footer">
            <p id={hintId} className={`search__hint ${isEmpty ? 'search__hint--error' : ''}`}>
              {isEmpty
                ? 'Digite ou cole um texto, afirmação ou notícia para continuar.'
                : 'Você pode colar parágrafos completos ou mensagens recebidas (Ctrl+Enter para enviar).'}
            </p>
            {query.length > 0 && (
              <span className="search__counter">{query.length} caracteres</span>
            )}
          </div>
        </form>
      )}

      {/* Formulário do modo Link */}
      {mode === 'link' && (
        <form onSubmit={onSubmit} role="search" aria-label="Verificar link da web">
          <div className={`search ${isEmpty ? 'search--error' : ''}`}>
            <label className="search__field">
              <Icon name="external" size={20} />
              <span className="sr-only">Link para verificação</span>
              <input
                type="url"
                className="search__input"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Cole o link da notícia, publicação ou página que deseja verificar"
                aria-describedby={hintId}
                disabled={loading}
              />
            </label>
            <Button type="submit" id="btn-verificar-link" disabled={loading}>
              {loading ? 'Verificando…' : 'Verificar link'}
              {!loading && <Icon name="arrow" size={20} />}
            </Button>
          </div>
          <div className="mode-demo-notice">
            <Icon name="info" size={17} />
            <p>
              A página é usada apenas para identificar o conteúdo analisado. A verificação é feita com fontes externas.
            </p>
          </div>
        </form>
      )}

      {/* Modo Arquivo/Documento (demonstrativo) */}
      {mode === 'file' && (
        <div className="file-dropzone" role="region" aria-label="Envio demonstrativo de documento">
          <div className="file-dropzone__content">
            <div className="file-dropzone__icon" aria-hidden="true">
              <Icon name="doc" size={32} />
            </div>
            <h4>Envio de documentos, imagens ou extratos</h4>
            <p>
              Arraste e solte arquivos em formato <strong>PDF, PNG ou JPG</strong> para checagem com fontes oficiais.
            </p>
            <div className="file-dropzone__actions">
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  useExample(
                    'Documento licitatório protocolado com suposta divergência no valor do termo aditivo.',
                  )
                }
              >
                <Icon name="flask" size={17} /> Testar com exemplo documental
              </Button>
            </div>
            <p className="file-dropzone__legal">
              <Icon name="shield" size={15} /> Nenhum documento é armazenado nesta etapa de protótipo.
            </p>
          </div>
        </div>
      )}

      {/* Chips de exemplos rápidos */}
      {status === 'idle' && mode === 'text' && (
        <div className="chips" aria-label="Exemplos prontos">
          <span className="chips__label">Experimente colar:</span>
          {exampleQueries.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="chip"
              onClick={() => useExample(ex.query)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}

      {/* Área dinâmica de resultado ou estados */}
      <div ref={areaRef} style={{ scrollMarginTop: 96 }} aria-live="polite">
        {status !== 'idle' && (
          <div style={{ marginTop: 'var(--sp-5)' }}>
            {loading && <LoadingState />}
            {status === 'success' && result && <ResultCard result={result} onNew={newCheck} />}
            {status === 'error' && <ErrorState onRetry={() => run(lastQuery)} />}
            {status === 'source-unavailable' && (
              <SourceUnavailableState
                onRetry={() => run(lastQuery)}
                sourceName={unavailableSourceName}
              />
            )}
            {status === 'unsupported-format' && (
              <UnsupportedFormatState onReset={newCheck} />
            )}
            {isEmpty && <EmptyState onExample={() => useExample()} />}
          </div>
        )}
      </div>

      {/* Painel didático de demonstração para os 5 estados */}
      <div className="demo-panel" aria-label="Painel de demonstração das classificações">
        <p className="demo-panel__title">
          <Icon name="flask" size={18} /> Modo demonstração com evidências simuladas
        </p>
        <p>
          Simule cada uma das 5 classificações oficiais para avaliar a apresentação das afirmações, evidências e fontes:
        </p>
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
            onClick={() => run(`${query.trim() || exampleQueries[0].query} #fonte-indisponivel`)}
            disabled={loading}
          >
            <span className="chip__dot" style={{ background: '#e08a00' }} />
            Fonte indisponível
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => run(`${query.trim() || exampleQueries[0].query} #formato-invalido`)}
            disabled={loading}
          >
            <span className="chip__dot" style={{ background: '#718096' }} />
            Formato não suportado
          </button>
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
    </div>
  )
}
