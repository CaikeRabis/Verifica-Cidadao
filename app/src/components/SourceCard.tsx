import type { Source } from '../types'
import Icon from './Icon'

interface Props {
  source: Source
  detailed?: boolean
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export default function SourceCard({ source, detailed }: Props) {
  return (
    <a
      className={`source-card ${detailed ? 'source-card--detailed' : ''}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${source.name} (abre em nova aba)`}
    >
      <span className="source-card__mark" aria-hidden="true">
        {initials(source.name)}
      </span>
      <span>
        <span className="source-card__name">{source.name}</span>
        <br />
        <span className="source-card__domain">{source.domain}</span>
        {source.readStatus === 'read' && (
          <span style={{ marginLeft: 8, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 999, background: '#eefbf4', color: '#0b683e', fontWeight: 600 }}>
            Página lida
          </span>
        )}
        {source.readStatus && source.readStatus !== 'read' && (
          <span style={{ marginLeft: 8, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 999, background: '#f4f6f8', color: '#667085', fontWeight: 600 }}>
            Não lida
          </span>
        )}
        {detailed && <p>{source.description}</p>}
      </span>
      <Icon name="external" size={18} className="source-card__ext" />
    </a>
  )
}
