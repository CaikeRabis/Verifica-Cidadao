import { usePageTitle } from '../hooks/usePageTitle'
import PageHero from '../components/PageHero'
import PrincipleNotice from '../components/PrincipleNotice'
import ModulesGrid from '../components/ModulesGrid'

export default function AboutPage() {
  usePageTitle('Sobre')
  return (
    <>
      <PageHero eyebrow="O projeto" title="Sobre o Verifica Cidadão">
        Uma plataforma de cidadania digital que integra Inteligência Artificial, Transparência Pública e Educação
        Cidadã.
      </PageHero>
      <section className="section">
        <div className="container">
          <div className="prose">
            <h2>Nosso propósito</h2>
            <p>
              Ajudar cidadãos a verificar informações, compreender evidências e acessar fontes confiáveis, transformando
              dados públicos complexos em explicações compreensíveis.
            </p>
            <h2>Em que acreditamos</h2>
            <ul>
              <li>Antes de acreditar, verificar.</li>
              <li>Antes de compartilhar, conferir.</li>
              <li>Antes de acusar, buscar evidências.</li>
            </ul>
            <p>
              Uma sociedade melhor informada tem melhores condições de participar, fiscalizar e tomar decisões
              conscientes.
            </p>
          </div>
        </div>
      </section>
      <section className="section section--tint">
        <div className="container">
          <div className="section-head">
            <h2>Módulos da plataforma</h2>
          </div>
          <ModulesGrid />
        </div>
      </section>
      <div className="section">
        <div className="container">
          <PrincipleNotice />
        </div>
      </div>
    </>
  )
}
