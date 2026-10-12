import { educationTopics } from '../data/content'
import Icon from './Icon'

export default function EducationGrid() {
  return (
    <div className="edu-grid">
      {educationTopics.map((t) => (
        <article key={t.id} className="edu-card">
          <span className="edu-card__icon">
            <Icon name="book" size={24} />
          </span>
          <h3>{t.title}</h3>
          <p>{t.description}</p>
          <div className="edu-card__foot">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="clock" size={16} /> {t.duration}
            </span>
            <span className="tag tag--soon" style={{ marginTop: 0 }}>Em breve</span>
          </div>
        </article>
      ))}
    </div>
  )
}
