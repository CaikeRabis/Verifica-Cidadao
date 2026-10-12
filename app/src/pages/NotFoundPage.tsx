import { usePageTitle } from '../hooks/usePageTitle'
import Button from '../components/Button'
import Icon from '../components/Icon'

export default function NotFoundPage() {
  usePageTitle('Página não encontrada')
  return (
    <section className="container not-found">
      <div className="state__icon" style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--vc-blue-50)', color: 'var(--vc-blue)' }}>
        <Icon name="question" size={34} />
      </div>
      <h1 style={{ fontSize: '2rem' }}>Página não encontrada</h1>
      <p style={{ margin: '12px 0 24px' }}>O endereço que você acessou não existe ou foi movido.</p>
      <Button to="/">Voltar ao início</Button>
    </section>
  )
}
