// src/tests/Register.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Register from '../components/Register'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../firebase/firebase', () => ({ auth: {}, db: {} }))

const mockRegister = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}))

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderPage = () => render(<MemoryRouter><Register /></MemoryRouter>)

const fillForm = (
  name     = 'Jane Dlamini',
  email    = 'jane@example.com',
  password = 'password123'
) => {
  fireEvent.change(screen.getByPlaceholderText('Jane Dlamini'), {
    target: { value: name },
  })
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), {
    target: { value: password },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Register — rendering', () => {

  // Given the register page loads,
  // When the component renders,
  // Then the heading and subtitle are visible.
  it('renders the heading', () => {
    renderPage()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(screen.getByText('Join StokvelHub and start saving together')).toBeInTheDocument()
  })

  it('renders the full name label and input', () => {
    renderPage()
    expect(screen.getByText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jane Dlamini')).toBeInTheDocument()
  })

  it('renders the email label and input', () => {
    renderPage()
    expect(screen.getByText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('renders the password label and input', () => {
    renderPage()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
  })

  it('renders the Create account button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  // Given the footer renders,
  // When a user already has an account,
  // Then the Sign in link points to /login.
  it('renders the Sign in link pointing to /login', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  // Given the password field renders,
  // When inspecting its type,
  // Then the value is masked.
  it('masks the password input', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toHaveAttribute('type', 'password')
  })

  // Given the page loads,
  // When no submission has been attempted,
  // Then no error is visible.
  it('shows no error on initial render', () => {
    renderPage()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Register — form interaction', () => {

  // Given the name input is present,
  // When the user types in it,
  // Then the value updates.
  it('updates name input when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('Jane Dlamini')
    fireEvent.change(input, { target: { value: 'Sipho Mokoena' } })
    expect(input.value).toBe('Sipho Mokoena')
  })

  it('updates email input when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('you@example.com')
    fireEvent.change(input, { target: { value: 'sipho@stokvel.co.za' } })
    expect(input.value).toBe('sipho@stokvel.co.za')
  })

  it('updates password input when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('Min. 8 characters')
    fireEvent.change(input, { target: { value: 'securepass' } })
    expect(input.value).toBe('securepass')
  })
})

describe('Register — successful submission', () => {

  beforeEach(() => {
    mockRegister.mockReset()
    mockNavigate.mockReset()
  })

  // Given all fields are filled and register succeeds,
  // When the form is submitted,
  // Then register is called with the correct arguments.
  it('calls register with name, email and password', async () => {
    mockRegister.mockResolvedValue('user')
    renderPage()
    fillForm('Jane Dlamini', 'jane@example.com', 'password123')

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Jane Dlamini',
        'jane@example.com',
        'password123'
      )
    })
  })

  // Given registration succeeds,
  // When the form is submitted,
  // Then the user is navigated to /dashboard.
  it('navigates to /dashboard after successful registration', async () => {
    mockRegister.mockResolvedValue('user')
    renderPage()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('Register — error handling', () => {

  beforeEach(() => {
    mockRegister.mockReset()
    mockNavigate.mockReset()
  })

  // Given registration fails with an error,
  // When the form is submitted,
  // Then the error message is displayed.
  it('shows error message when register throws', async () => {
    mockRegister.mockRejectedValue(new Error('Email already in use'))
    renderPage()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })

  // Given a failed registration,
  // When the error is shown,
  // Then navigate is NOT called.
  it('does not navigate when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Firebase: weak password'))
    renderPage()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await screen.findByText('Firebase: weak password')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // Given a previous error is showing,
  // When the form is submitted again successfully,
  // Then the error is cleared.
  it('clears previous error on new successful submission', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email already in use'))
    mockRegister.mockResolvedValueOnce('user')
    renderPage()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await screen.findByText('Email already in use')

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(screen.queryByText('Email already in use')).not.toBeInTheDocument()
    )
  })
})