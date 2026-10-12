import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Button from './Button'
import Icon from './Icon'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/fontes', label: 'Fontes' },
  { to: '/educacao-cidada', label: 'Educação Cidadã' },
  { to: '/sobre', label: 'Sobre' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <nav id="menu-principal" className={`nav ${open ? 'is-open' : ''}`} aria-label="Navegação principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
          <Button variant="outline" className="nav__enter" type="button">
            Entrar
          </Button>
        </nav>
        <div className="header-actions">
          {/* Apenas visual nesta fase: sem autenticação real. */}
          <Button variant="outline" small id="btn-entrar" type="button">
            Entrar
          </Button>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </div>
    </header>
  )
}
