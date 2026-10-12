import { classificationOrder, classifications } from '../data/classifications'
import { ClassificationIcon } from './ClassificationBadge'

export default function ClassificationShowcase() {
  return (
    <div className="cl-grid">
      {classificationOrder.map((c) => (
        <article key={c} className={`cl cl-card cl--${c}`}>
          <ClassificationIcon value={c} large />
          <h3>{classifications[c].label}</h3>
          <p>{classifications[c].description}</p>
        </article>
      ))}
    </div>
  )
}
