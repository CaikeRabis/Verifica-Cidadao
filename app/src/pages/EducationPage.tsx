import { usePageTitle } from '../hooks/usePageTitle'
import PageHero from '../components/PageHero'
import EducationGrid from '../components/EducationGrid'
import PrincipleNotice from '../components/PrincipleNotice'

export default function EducationPage() {
  usePageTitle('Educação Cidadã')
  return (
    <>
      <PageHero eyebrow="Módulo" title="Educação Cidadã">
        Conteúdos para entender transparência, reconhecer fontes confiáveis e participar do controle social. Os
        materiais completos chegam em breve.
      </PageHero>
      <section className="section">
        <div className="container">
          <EducationGrid />
        </div>
      </section>
      <div className="principle-wrap">
        <div className="container">
          <PrincipleNotice />
        </div>
      </div>
    </>
  )
}
