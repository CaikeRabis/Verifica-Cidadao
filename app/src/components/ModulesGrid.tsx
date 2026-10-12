import { Link } from 'react-router-dom'
import { modules } from '../data/content'
import Icon from './Icon'

export default function ModulesGrid() {
  return (
    <div className="modules-grid">
      {modules.map((m) => (
        <article key={m.id} className={`module ${m.active ? 'module--active' : 'module--soon'}`}>
          <span className="module__icon">
            <Icon name={m.icon === 'document' ? 'doc' : m.icon} size={26} />
          </span>
          <h3>{m.title}</h3>
          <p>{m.description}</p>
          {m.active ? (
            <Link to="/" className="tag tag--active" aria-label="Verificador de Informações: disponível">
              Disponível
            </Link>
          ) : (
            <span className="tag tag--soon">Em breve</span>
          )}
        </article>
      ))}
    </div>
  )
}
