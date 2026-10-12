import { usePageTitle } from '../hooks/usePageTitle'
import PageHero from '../components/PageHero'
import HowItWorks from '../components/HowItWorks'
import ClassificationShowcase from '../components/ClassificationShowcase'
import PrincipleNotice from '../components/PrincipleNotice'
import Button from '../components/Button'
import Icon from '../components/Icon'

export default function HowItWorksPage() {
  usePageTitle('Como funciona')
  return (
    <>
      <PageHero eyebrow="Passo a passo" title="Como funciona">
        Em quatro etapas simples, você recebe uma análise com evidências, fontes e grau de confirmação.
      </PageHero>
      <section className="section">
        <div className="container">
          <HowItWorks />
        </div>
      </section>
      <section className="section section--tint">
        <div className="container">
          <div className="section-head">
            <h2>Entenda as classificações</h2>
            <p>O sistema nunca afirma que algo é falso sem evidências. Veja os cinco resultados possíveis.</p>
          </div>
          <ClassificationShowcase />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <PrincipleNotice />
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Button to="/">
              Experimentar agora <Icon name="arrow" size={20} />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
