import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Verifier from '../components/Verifier'
import ResultCard from '../components/ResultCard'
import { verifyInformation } from '../services/verificationService'
import type { VerificationResult } from '../types'

afterEach(() => vi.restoreAllMocks())

describe('fluxo de entrada', () => {
  it('alterna entre texto e link sem mostrar os dois campos ao mesmo tempo', async () => {
    const user = userEvent.setup()
    render(<Verifier />)
    expect(screen.getByPlaceholderText(/cole aqui uma afirmação/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /link da web/i }))
    expect(screen.getByPlaceholderText(/cole o link/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/cole aqui uma afirmação/i)).not.toBeInTheDocument()
  })

  it('envia inputType compatível para texto e URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 't', query: 'texto suficiente', classification: 'sem-evidencias', summary: '', explanation: '', sources: [], analyzedAt: new Date().toISOString() }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'u', query: 'https://exemplo.com', classification: 'sem-evidencias', summary: '', explanation: '', sources: [], analyzedAt: new Date().toISOString() }), { status: 200 }))
    await verifyInformation('texto suficiente', undefined, 'text')
    await verifyInformation('https://exemplo.com', undefined, 'url')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ inputType: 'text', input: 'texto suficiente' })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ inputType: 'url', input: 'https://exemplo.com' })
  })
})

describe('resultado URL', () => {
  it('separa conteúdo analisado de fontes consultadas', () => {
    const result: VerificationResult = {
      id: 'r', query: 'https://origem.exemplo/materia', classification: 'confirmada', summary: 'Resumo', explanation: 'Explicação',
      sources: [{ id: 's1', name: 'Fonte externa', domain: 'dados.gov.br', description: 'Fonte oficial', url: 'https://dados.gov.br/fonte', readStatus: 'read' }],
      analyzedAt: '2024-01-02T12:00:00.000Z',
      analyzedSource: { url: 'https://origem.exemplo/materia', finalUrl: 'https://origem.exemplo/materia-final', domain: 'origem.exemplo', title: 'Matéria original', publishedDate: '2024-01-02' },
    }
    render(<MemoryRouter><ResultCard result={result} onNew={() => undefined} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Conteúdo analisado' })).toBeInTheDocument()
    expect(screen.getByText('Matéria original')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fontes consultadas' })).toBeInTheDocument()
    expect(screen.getByText('Fonte externa')).toBeInTheDocument()
    expect(screen.queryByText('origem.exemplo', { selector: '.source-card__domain' })).not.toBeInTheDocument()
  })
})
