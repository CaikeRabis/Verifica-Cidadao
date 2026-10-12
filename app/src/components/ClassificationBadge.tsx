import type { Classification } from '../types'
import { classifications } from '../data/classifications'
import Icon, { type IconName } from './Icon'

const iconFor: Record<Classification, IconName> = {
  confirmada: 'check',
  'parcialmente-confirmada': 'alert',
  'sem-evidencias': 'question',
  contradita: 'x',
  'analise-humana': 'doc',
}

export function ClassificationIcon({ value, large }: { value: Classification; large?: boolean }) {
  return (
    <span className={`cl-icon ${large ? 'cl-icon--lg' : ''}`}>
      <Icon name={iconFor[value]} size={large ? 34 : 16} strokeWidth={large ? 2.6 : 2.4} />
    </span>
  )
}

export default function ClassificationBadge({ value }: { value: Classification }) {
  return (
    <span className={`cl cl-badge cl--${value}`}>
      <ClassificationIcon value={value} />
      {classifications[value].label}
    </span>
  )
}
