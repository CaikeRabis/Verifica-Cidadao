import { steps } from '../data/content'

export default function HowItWorks() {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={s.title} className="step">
          <span className="step__num" aria-hidden="true">
            {i + 1}
          </span>
          <h3>{s.title}</h3>
          <p>{s.description}</p>
        </li>
      ))}
    </ol>
  )
}
