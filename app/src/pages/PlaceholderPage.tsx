import { usePageTitle } from '../hooks/usePageTitle'
import PageHero from '../components/PageHero'
import Button from '../components/Button'
import Icon from '../components/Icon'

const copy: Record<string, { title: string; text: string }> = {
  privacidade: {
    title: 'Privacidade',
    text: 'A política de privacidade será publicada junto com a versão que tratar dados reais, em conformidade com a LGPD.',
  },
  termos: {
    title: 'Termos de uso',
    text: 'Os termos de uso serão definidos antes da abertura da plataforma ao público.',
  },
  contato: {
    title: 'Contato',
    text: 'Os canais oficiais de contato serão divulgados em breve.',
  },
}

export default function PlaceholderPage({ kind }: { kind: keyof typeof copy }) {
  const c = copy[kind]
  usePageTitle(c.title)
  return (
    <>
      <PageHero title={c.title}>{c.text}</PageHero>
      <section className="section">
        <div className="container">
          <Button to="/" variant="outline">
            <Icon name="arrow" size={18} style={{ transform: 'rotate(180deg)' }} /> Voltar ao início
          </Button>
        </div>
      </section>
    </>
  )
}
