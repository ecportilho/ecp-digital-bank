import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Confirmar</Button>)
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Enviar</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Desabilitado</Button>)
    expect(screen.getByRole('button', { name: 'Desabilitado' })).toBeDisabled()
  })
})
