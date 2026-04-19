// src/tests/Login.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Login from '../components/Login'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../firebase/firebase', () => ({ auth: {}, db: {} }))

const mockLogin = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderPage = () => render(<MemoryRouter><Login /></MemoryRouter>)

const fillAndSubmit = (email = 'user@test.com', password = 'password123') => {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Login Page — rendering', () => {

  // Given the login page loads,
  // When the component renders,
  // Then the welcome heading is visible.
  it('renders the welcome heading', () => {
    renderPage()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })

  it('renders the email label and input', () => {
    renderPage()
    expect(screen.getByText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('renders the password label and input', () => {
    renderPage()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders the Sign in button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  // Given the footer link renders,
  // When a user has no account,
  // Then the Create one link points to /register.
  it('renders the Create one link pointing to /register', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /create one/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/register')
  })

  // Given the form renders,
  // When no submission has been attempted,
  // Then no error message is visible.
  it('shows no error message on initial render', () => {
    renderPage()
    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })
})

describe('Login Page — form interaction', () => {

  // Given the email input is present,
  // When the user types in it,
  // Then the input value updates.
  it('updates email input value when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('you@example.com')
    fireEvent.change(input, { target: { value: 'alice@stokvel.co.za' } })
    expect(input.value).toBe('alice@stokvel.co.za')
  })

  // Given the password input is present,
  // When the user types in it,
  // Then the input value updates.
  it('updates password input value when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('••••••••')
    fireEvent.change(input, { target: { value: 'securepass' } })
    expect(input.value).toBe('securepass')
  })

  // Given the password field renders,
  // When inspecting its type,
  // Then it is type="password" so the value is masked.
  it('masks the password input', () => {
    renderPage()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
  })
})

describe('Login Page — navigation after login', () => {

  beforeEach(() => mockLogin.mockReset())

  // Given valid admin credentials,
  // When the form is submitted,
  // Then the user is navigated to /admin.
  it('navigates to /admin when role is admin', async () => {
    mockLogin.mockResolvedValue('admin')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })

  // Given valid treasurer credentials,
  // When the form is submitted,
  // Then the user is navigated to /treasurer.
  it('navigates to /treasurer when role is treasurer', async () => {
    mockLogin.mockResolvedValue('treasurer')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/treasurer'))
  })

  // Given valid standard user credentials,
  // When the form is submitted,
  // Then the user is navigated to /dashboard.
  it('navigates to /dashboard for standard user role', async () => {
    mockLogin.mockResolvedValue('user')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('Login Page — error handling', () => {

  beforeEach(() => mockLogin.mockReset())

  // Given invalid credentials are submitted,
  // When the login function throws,
  // Then an error message is displayed.
 
  // Given the form is submitted,
  // When the login call is in progress,
  // Then the button shows Signing in… and is disabled.
  it('disables button and shows Signing in… while loading', async () => {
    mockLogin.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('user'), 200))
    )
    renderPage()
    fillAndSubmit()
    const btn = screen.getByRole('button', { name: /signing in/i })
    expect(btn).toBeDisabled()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})