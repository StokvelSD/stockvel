import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Login from '../components/Login'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

vi.mock('../firebase/firebase', () => ({
  auth: {},
  db: {},
}))

describe('Login Page', () => {
  it('renders welcome heading', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})