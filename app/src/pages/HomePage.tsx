import { Link } from 'react-router-dom'
import { slogan } from '../data/content'
import { sources } from '../data/sources'
import { usePageTitle } from '../hooks/usePageTitle'
import Verifier from '../components/Verifier'
import Icon from '../components/Icon'
import HowItWorks from '../components/HowItWorks'
import ModulesGrid from '../components/ModulesGrid'
import SourceCard from '../components/SourceCard'
import ClassificationShowcase from '../components/ClassificationShowcase'
import PrincipleNotice from '../components/PrincipleNotice'
import Button from '../components/Button'

export default function HomePage() {
  usePageTitle()

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div>
            <h1 id="hero-title" className="hero__title">
              <span>{slogan.line1}</span>
              <span>{slogan.line2}</span>
              <span className="hl">{slogan.highlight}</span>
            </h1>
            <p className="hero__lead">
              O Verifica Cidadão ajuda você a verificar informações usando fontes públicas e confiáveis, apresentando
              evidências de forma simples e transparente.
            </p>
            <div className="hero__search">
              <Verifier />
            </div>
            <div className="hero__trust">
              <span><Icon name="check" size={18} strokeWidth={3} /> Fontes oficiais</span>
              <span><Icon name="shield" size={18} /> Sem acusações</span>
              <span><Icon name="book" size={18} /> Linguagem simples</span>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <img src="/brand/simbolo.png" alt="" />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="sec-classificacoes">
        <div className="container">
          <div className="section-head section-head--center">
            <span className="tricolor"><i /><i /><i /></span>
            <h2 id="sec-classificacoes" style={{ marginTop: 16 }}>Como apresentamos o resultado</h2>
            <p>Cada análise recebe uma classificação clara, com explicação e as fontes utilizadas.</p>
          </div>
          <ClassificationShowcase />
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="sec-como-funciona">
        <div className="container">
          <div className="section-head section-head--center">
            <span className="eyebrow">Passo a passo</span>
            <h2 id="sec-como-funciona">Como funciona</h2>
            <p>Um fluxo simples, pensado para qualquer pessoa.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      <section className="section" aria-labelledby="sec-fontes">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Transparência</span>
            <h2 id="sec-fontes">Fontes consultadas</h2>
            <p>Priorizamos portais oficiais, órgãos de controle e veículos reconhecidos. Exemplos ilustrativos:</p>
          </div>
          <div className="sources-grid">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Button variant="ghost" to="/fontes">
              Ver todas as fontes <Icon name="arrow" size={18} />
            </Button>
          </div>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="sec-modulos">
        <div className="container">
          <div className="section-head section-head--center">
            <span className="eyebrow">Plataforma</span>
            <h2 id="sec-modulos">Módulos do Verifica Cidadão</h2>
            <p>Hoje, o Verificador de Informações está disponível. Os demais chegam nas próximas etapas.</p>
          </div>
          <ModulesGrid />
        </div>
      </section>

      <section className="section" aria-label="Educação Cidadã e princípio do projeto">
        <div className="container">
          <div className="cta-band">
            <h2>Educação Cidadã</h2>
            <p>Aprenda a reconhecer fontes confiáveis, entender dados públicos e participar do controle social.</p>
            <Link to="/educacao-cidada" className="btn btn--primary">
              Explorar conteúdos <Icon name="arrow" size={20} />
            </Link>
          </div>
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
