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
const mockSignInWithGoogle = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ 
    login: mockLogin,
    signInWithGoogle: mockSignInWithGoogle,
  }),
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

  it('renders the Google sign-in button', () => {
    renderPage()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('renders the Create one link pointing to /register', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /create one/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/register')
  })

  it('shows no error message on initial render', () => {
    renderPage()
    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })

  it('renders the logo SVG', () => {
    renderPage()
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})

describe('Login Page — form interaction', () => {
  it('updates email input value when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('you@example.com')
    fireEvent.change(input, { target: { value: 'alice@stokvel.co.za' } })
    expect(input.value).toBe('alice@stokvel.co.za')
  })

  it('updates password input value when typed', () => {
    renderPage()
    const input = screen.getByPlaceholderText('••••••••')
    fireEvent.change(input, { target: { value: 'securepass' } })
    expect(input.value).toBe('securepass')
  })

  it('masks the password input', () => {
    renderPage()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
  })

  it('email input has required attribute', () => {
    renderPage()
    expect(screen.getByPlaceholderText('you@example.com')).toHaveAttribute('required')
  })

  it('password input has required attribute', () => {
    renderPage()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('required')
  })
})

describe('Login Page — form submission', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithGoogle.mockReset()
  })

  it('calls login with email and password on form submit', async () => {
    mockLogin.mockResolvedValue('user')
    renderPage()
    fillAndSubmit('test@example.com', 'mypassword123')
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'mypassword123')
    })
  })

  it('prevents submission when fields are empty', async () => {
    renderPage()
    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitBtn)
    
    expect(mockLogin).not.toHaveBeenCalled()
  })
})

describe('Login Page — navigation after login', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithGoogle.mockReset()
  })

  it('navigates to /admin when role is admin', async () => {
    mockLogin.mockResolvedValue('admin')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })

  it('navigates to /treasurer when role is treasurer', async () => {
    mockLogin.mockResolvedValue('treasurer')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/treasurer'))
  })

  it('navigates to /dashboard for standard user role', async () => {
    mockLogin.mockResolvedValue('user')
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('Login Page — Google Sign-In', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithGoogle.mockReset()
  })

  it('calls signInWithGoogle when Google button is clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue('user')
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })
  })

  it('navigates to /admin after Google sign-in with admin role', async () => {
    mockSignInWithGoogle.mockResolvedValue('admin')
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin')
    })
  })

  it('navigates to /treasurer after Google sign-in with treasurer role', async () => {
    mockSignInWithGoogle.mockResolvedValue('treasurer')
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/treasurer')
    })
  })

  it('navigates to /dashboard after Google sign-in with user role', async () => {
    mockSignInWithGoogle.mockResolvedValue('user')
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message when Google sign-in fails', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('Google auth failed'))
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    
    await waitFor(() => {
      expect(screen.getByText('Google sign-in failed. Please try again.')).toBeInTheDocument()
    })
  })
})

describe('Login Page — error handling', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithGoogle.mockReset()
  })

  it('shows error message when login fails with invalid credentials', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))
    renderPage()
    fillAndSubmit()
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables button and shows Signing in… while loading', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('user'), 200)))
    renderPage()
    fillAndSubmit()
    const btn = screen.getByRole('button', { name: /signing in/i })
    expect(btn).toBeDisabled()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('disables Google button while loading', async () => {
    mockSignInWithGoogle.mockImplementation(() => new Promise(() => {}))
    renderPage()
    const googleBtn = screen.getByText('Continue with Google')
    fireEvent.click(googleBtn)
    expect(googleBtn).toBeDisabled()
  })

  it('clears error message on new submission attempt', async () => {
    mockLogin.mockRejectedValueOnce(new Error('First fail'))
    renderPage()
    fillAndSubmit()
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument()
    })
    
    mockLogin.mockResolvedValue('user')
    fillAndSubmit()
    
    await waitFor(() => {
      expect(screen.queryByText('Invalid email or password. Please try again.')).not.toBeInTheDocument()
    })
  })
})

describe('Login Page — edge cases', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithGoogle.mockReset()
  })

  it('handles email with special characters', async () => {
    mockLogin.mockResolvedValue('user')
    renderPage()
    fillAndSubmit('test+special@example.com', 'password')
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test+special@example.com', 'password')
    })
  })

  it('handles very long email', async () => {
    mockLogin.mockResolvedValue('user')
    renderPage()
    const longEmail = 'a'.repeat(100) + '@example.com'
    fillAndSubmit(longEmail, 'password')
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(longEmail, 'password')
    })
  })

  it('handles empty email submission properly', async () => {
    renderPage()
    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitBtn)
    
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('handles empty password submission properly', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitBtn)
    
    expect(mockLogin).not.toHaveBeenCalled()
  })
})