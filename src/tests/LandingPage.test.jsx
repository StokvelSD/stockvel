// src/tests/LandingPage.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import LandingPage from '../components/LandingPage'

describe('LandingPage', () => {

  // Given the landing page loads,
  // When the hero section renders,
  // Then the main heading and subtitle are visible.
  it('renders the hero heading', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText(/Grow your money together/i)).toBeInTheDocument()
  })

  it('renders the hero subtitle', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText(/trusted rotating savings platform/i)).toBeInTheDocument()
  })

  // Given the hero section loads,
  // When a user views the page,
  // Then the Create a circle and Sign in links are visible with correct hrefs.
  it('renders the Create a circle link pointing to /register', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /create a circle/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/register')
  })

  it('renders the Sign in link pointing to /login', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  // Given the hero stats section renders,
  // When a user views the page,
  // Then key stats are displayed.
  it('renders hero stats', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText('50k+')).toBeInTheDocument()
    expect(screen.getByText('R2.4M')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  // Given the "How it works" section renders,
  // When a user views the page,
  // Then all three steps are visible.
  it('renders the How StokvelHub works section', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText('How StokvelHub works')).toBeInTheDocument()
    expect(screen.getByText('Join or start a circle')).toBeInTheDocument()
    expect(screen.getByText('Contribute monthly')).toBeInTheDocument()
    expect(screen.getByText('Receive your payout')).toBeInTheDocument()
  })

  // Given the Benefits section renders,
  // When a user views the page,
  // Then all six benefit cards are visible.
  it('renders all six benefit cards', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText('Real-time tracking')).toBeInTheDocument()
    expect(screen.getByText('Bank-grade security')).toBeInTheDocument()
    expect(screen.getByText('Automated reminders')).toBeInTheDocument()
    expect(screen.getByText('Flexible groups')).toBeInTheDocument()
    expect(screen.getByText('Audit-ready records')).toBeInTheDocument()
    expect(screen.getByText('Zero platform fees')).toBeInTheDocument()
  })

  // Given the testimonial section renders,
  // When a user views the page,
  // Then the testimonial quote and author are visible.
  it('renders the testimonial', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText(/WhatsApp group with a spreadsheet/i)).toBeInTheDocument()
    expect(screen.getByText(/Nosipho L/i)).toBeInTheDocument()
  })

  // Given the CTA email form is visible,
  // When the user types an email and submits,
  // Then an alert is shown with the entered email.
  it('shows alert and clears input on form submit', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<MemoryRouter><LandingPage /></MemoryRouter>)

    const input = screen.getByPlaceholderText('Your email address')
    fireEvent.change(input, { target: { value: 'test@stokvel.co.za' } })
    fireEvent.click(screen.getByRole('button', { name: /notify me/i }))

    expect(alertMock).toHaveBeenCalledWith("Thanks! We'll be in touch at test@stokvel.co.za")
    expect(input.value).toBe('')

    alertMock.mockRestore()
  })

  // Given the footer renders,
  // When a user views the page,
  // Then the brand name and copyright notice are visible.
  it('renders the footer with brand name', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText(/StokvelHub \(Pty\) Ltd/i)).toBeInTheDocument()
  })

  it('renders footer navigation links', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('About us')).toBeInTheDocument()
    expect(screen.getByText('Terms')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
  })

})