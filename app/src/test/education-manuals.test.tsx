import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { educationManuals } from '../data/educationManuals'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

afterEach(cleanup)

describe('manuais da Educação Cidadã', () => {
  it('renderiza seis cards navegáveis sem o marcador Em breve', () => {
    renderAt('/educacao')
    const manualLinks = screen.getAllByRole('link', { name: /ler manual/i })
    expect(manualLinks).toHaveLength(6)
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument()
    educationManuals.forEach((manual) => {
      expect(screen.getByText(manual.title)).toBeInTheDocument()
    })
    expect(manualLinks.map((link) => link.getAttribute('href'))).toEqual(educationManuals.map((manual) => `/educacao/${manual.slug}`))
  })

  it.each(educationManuals)('renderiza o conteúdo principal de $slug', (manual) => {
    renderAt(`/educacao/${manual.slug}`)
    expect(screen.getByRole('heading', { level: 1, name: manual.title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Em resumo' })).toBeInTheDocument()
    expect(screen.getByText('A IA não acusa.')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Navegação estrutural' })).getByRole('link', { name: 'Educação Cidadã' })).toHaveAttribute('href', '/educacao')
  })

  it('mostra página não encontrada para slug inválido', () => {
    renderAt('/educacao/manual-inexistente')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('navega entre manuais, volta à grade e abre o verificador', async () => {
    const user = userEvent.setup()
    renderAt('/educacao/fonte-confiavel')

    await user.click(screen.getByRole('link', { name: /próximo manual/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Como verificar uma informação' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /manual anterior/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Como identificar uma fonte confiável' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /voltar para educação cidadã/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Educação Cidadã' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: /ler manual/i })[0])
    await user.click(screen.getByRole('link', { name: /verificar uma informação/i }))
    expect(screen.getByPlaceholderText(/cole aqui uma afirmação/i)).toBeInTheDocument()
  })
})
