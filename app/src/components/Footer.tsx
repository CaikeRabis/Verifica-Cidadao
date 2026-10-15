import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <img src="/brand/logo-horizontal.png" alt="Verifica Cidadão" />
            <p>
              Plataforma de cidadania digital que integra Inteligência Artificial, Transparência Pública e Educação
              Cidadã para ajudar você a verificar informações com base em evidências.
            </p>
          </div>
          <div className="footer__col">
            <h4>Verifica Cidadão</h4>
            <ul>
              <li><Link to="/sobre">Sobre</Link></li>
              <li><Link to="/fontes">Fontes</Link></li>
              <li><Link to="/educacao">Educação Cidadã</Link></li>
              <li><Link to="/como-funciona">Como funciona</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Institucional</h4>
            <ul>
              <li><Link to="/privacidade">Privacidade</Link></li>
              <li><Link to="/termos">Termos</Link></li>
              <li><Link to="/contato">Contato</Link></li>
            </ul>
            <div className="socials" aria-label="Redes sociais (exemplo)">
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="YouTube (em breve)"><Icon name="youtube" /></a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram (em breve)"><Icon name="instagram" /></a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="X (em breve)"><Icon name="twitter" /></a>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Verifica Cidadão. Antes de acreditar. Antes de compartilhar. Verifique.</span>
          <span>Versão de demonstração com dados simulados.</span>
        </div>
      </div>
    </footer>
  )
}
