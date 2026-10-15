import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Icon from '../components/Icon'
import PrincipleNotice from '../components/PrincipleNotice'
import PageHero from '../components/PageHero'
import { educationManualBySlug, educationManuals } from '../data/educationManuals'
import { usePageTitle } from '../hooks/usePageTitle'
import NotFoundPage from './NotFoundPage'

export default function EducationManualPage() {
  const { slug } = useParams()
  const manual = educationManualBySlug(slug)

  usePageTitle(manual ? manual.title : 'Página não encontrada')

  if (!manual) return <NotFoundPage />

  const currentIndex = educationManuals.findIndex((item) => item.slug === manual.slug)
  const previous = educationManuals[currentIndex - 1]
  const next = educationManuals[currentIndex + 1]

  return (
    <>
      <PageHero eyebrow="Educação Cidadã" title={manual.title}>
        {manual.description}
      </PageHero>

      <article className="education-manual section">
        <div className="container education-manual__container">
          <nav className="education-breadcrumb" aria-label="Navegação estrutural">
            <Link to="/educacao">Educação Cidadã</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{manual.title}</span>
          </nav>

          <p className="education-manual__duration"><Icon name="clock" size={18} /> {manual.duration}</p>

          <div className="education-manual__body">
            {manual.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

            {manual.sections.map((section) => (
              <section key={section.title} className="education-manual__section">
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {section.callouts?.map((callout) => (
                  <aside key={`${callout.type}-${callout.title}`} className={`education-callout education-callout--${callout.type}`}>
                    <h3>{callout.title}</h3>
                    <p>{callout.text}</p>
                  </aside>
                ))}
              </section>
            ))}

            {manual.checklist && (
              <section className="education-manual__section education-checklist">
                <h2>Checklist para sua consulta</h2>
                <ul>
                  {manual.checklist.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}

            <section className="education-summary" aria-labelledby="resumo-title">
              <h2 id="resumo-title">Em resumo</h2>
              {manual.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>

            <section className="education-verifier" aria-labelledby="usar-verificador-title">
              <span className="education-verifier__icon"><Icon name="search" size={24} /></span>
              <div>
                <h2 id="usar-verificador-title">Use o Verifica Cidadão</h2>
                <p>Quer investigar uma afirmação? Use o verificador para consultar e comparar fontes sobre o tema.</p>
                <Button to="/">Verificar uma informação <Icon name="arrow" size={18} /></Button>
              </div>
            </section>

            <PrincipleNotice />
            <p className="education-manual__principle"><strong>A IA não acusa.</strong> Ela auxilia na organização de evidências e não substitui a análise humana, profissional ou institucional.</p>
            <p className="education-manual__disclaimer">O Verifica Cidadão auxilia na consulta e comparação de fontes, mas nenhuma ferramenta de inteligência artificial é infalível. Em situações relevantes, consulte também os documentos originais e fontes oficiais.</p>
          </div>

          <nav className="education-manual__navigation" aria-label="Navegação entre manuais">
            {previous ? <Link to={`/educacao/${previous.slug}`}>← Manual anterior</Link> : <span />}
            {next ? <Link to={`/educacao/${next.slug}`}>Próximo manual →</Link> : <span />}
          </nav>
          <Link to="/educacao" className="education-manual__back">← Voltar para Educação Cidadã</Link>
        </div>
      </article>
    </>
  )
}
