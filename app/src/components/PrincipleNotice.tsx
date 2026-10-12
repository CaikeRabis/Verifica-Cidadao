import { principleText } from '../data/content'
import Icon from './Icon'

export default function PrincipleNotice() {
  return (
    <aside className="principle" aria-label="Princípio do Verifica Cidadão">
      <span className="principle__icon">
        <Icon name="shield" size={26} />
      </span>
      <div>
        <strong>Nosso compromisso</strong>
        <p>{principleText}</p>
      </div>
    </aside>
  )
}
