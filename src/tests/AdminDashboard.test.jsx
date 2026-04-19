// src/tests/AdminPage.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AdminPage from '../pages/AdminPage'

// Mock Firebase
vi.mock('../firebase/firebase', () => ({
  db: {},
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [
        {
          id: 'user-1',
          data: () => ({
            name: 'Alice Dlamini',
            email: 'alice@example.com',
            role: 'user',
            createdAt: { toDate: () => new Date('2025-01-15') },
          }),
        },
        {
          id: 'user-2',
          data: () => ({
            name: 'Bob Mokoena',
            email: 'bob@example.com',
            role: 'treasurer',
            createdAt: { toDate: () => new Date('2025-03-10') },
          }),
        },
        {
          id: 'user-3',
          data: () => ({
            name: 'Carol Admin',
            email: 'carol@example.com',
            role: 'admin',
            createdAt: { toDate: () => new Date('2025-06-01') },
          }),
        },
      ],
    })
  ),
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminPage', () => {

  // Given the admin page loads,
  // When users are fetched from Firestore,
  // Then the heading and user management section are visible.
  it('renders the Admin Dashboard heading', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
  })

  // Given users exist in Firestore,
  // When the page loads,
  // Then all users are displayed in the table.
  it('displays fetched users in the table', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(await screen.findByText('Alice Dlamini')).toBeInTheDocument()
    expect(screen.getByText('Bob Mokoena')).toBeInTheDocument()
    expect(screen.getByText('Carol Admin')).toBeInTheDocument()
  })

  // Given users are loaded,
  // When the page renders,
  // Then the stat cards show correct counts.
  

  // Given the search box is visible,
  // When an admin types a name,
  // Then only matching users are shown.
  it('filters users by search input', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    await screen.findByText('Alice Dlamini')

    const searchInput = screen.getByPlaceholderText('Search by name or email…')
    fireEvent.change(searchInput, { target: { value: 'Bob' } })

    expect(screen.getByText('Bob Mokoena')).toBeInTheDocument()
    expect(screen.queryByText('Alice Dlamini')).not.toBeInTheDocument()
  })

  // Given the Create group button is visible,
  // When an admin clicks it,
  // Then they are navigated to /create-group.
  it('navigates to /create-group when Create group is clicked', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    await screen.findByText('Alice Dlamini')

    fireEvent.click(screen.getByText('Create group'))
    expect(mockNavigate).toHaveBeenCalledWith('/create-group')
  })

  // Given users are loaded,
  // When no users match the search term,
  // Then a "No users found" message is shown.
  it('shows no users found message when search has no results', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    await screen.findByText('Alice Dlamini')

    fireEvent.change(screen.getByPlaceholderText('Search by name or email…'), {
      target: { value: 'zzznomatch' },
    })

    expect(screen.getByText('No users found.')).toBeInTheDocument()
  })

  // Given a user row has a role dropdown,
  // When the admin changes the role and confirms,
  // Then updateDoc is called with the new role.
  it('calls updateDoc when role is changed and confirmed', async () => {
    const { updateDoc } = await import('firebase/firestore')
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    await screen.findByText('Alice Dlamini')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'treasurer' } })

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled()
    })
  })

})