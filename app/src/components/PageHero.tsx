import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: string
  children?: ReactNode
}

export default function PageHero({ eyebrow, title, children }: Props) {
  return (
    <section className="page-hero">
      <div className="container">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  )
}
