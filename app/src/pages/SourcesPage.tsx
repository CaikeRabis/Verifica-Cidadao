import { usePageTitle } from '../hooks/usePageTitle'
import { sources } from '../data/sources'
import PageHero from '../components/PageHero'
import SourceCard from '../components/SourceCard'

export default function SourcesPage() {
  usePageTitle('Fontes')
  return (
    <>
      <PageHero eyebrow="Transparência" title="Fontes consultadas">
        A plataforma informa sempre de onde veio cada informação. São priorizados portais oficiais, órgãos de
        controle, legislação e veículos reconhecidos.
      </PageHero>
      <section className="section">
        <div className="container">
          <div className="sources-grid">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} detailed />
            ))}
          </div>
          <p style={{ marginTop: 'var(--sp-5)', fontSize: '0.92rem' }}>
            Lista meramente ilustrativa nesta fase. A seleção real de fontes será definida na etapa de integração.
          </p>
        </div>
      </section>
    </>
  )
}
