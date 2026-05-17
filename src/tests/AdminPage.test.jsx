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

// Mock window.open for PDF export
const mockWindowOpen = vi.fn()
const mockPrint = vi.fn()
const mockDocumentWrite = vi.fn()
const mockDocumentClose = vi.fn()

// Mock Firestore functions with more comprehensive data
const mockUpdateDoc = vi.fn(() => Promise.resolve())
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: vi.fn(),
  updateDoc: (...args) => mockUpdateDoc(...args),
}))

// ─── Test Data ───────────────────────────────────────────────────────────────────

const mockUsers = [
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
]

const mockContributions = [
  {
    id: 'contrib-1',
    data: () => ({
      member: 'Alice Dlamini',
      userId: 'user-1',
      groupId: 'group-1',
      amount: 500,
      paymentMethod: 'card',
      type: 'monthly',
      status: 'paid',
      date: '2025-01-15',
    }),
  },
  {
    id: 'contrib-2',
    data: () => ({
      member: 'Bob Mokoena',
      userId: 'user-2',
      groupId: 'group-1',
      amount: 500,
      paymentMethod: 'bank',
      type: 'monthly',
      status: 'pending',
      date: '2025-02-10',
    }),
  },
  {
    id: 'contrib-3',
    data: () => ({
      member: 'Carol Admin',
      userId: 'user-3',
      groupId: 'group-2',
      amount: 1000,
      paymentMethod: 'card',
      type: 'monthly',
      status: 'completed',
      date: '2025-03-05',
    }),
  },
]

const mockGroups = [
  {
    id: 'group-1',
    data: () => ({
      groupName: 'Savings Stokvel',
      members: ['user-1', 'user-2'],
    }),
  },
  {
    id: 'group-2',
    data: () => ({
      groupName: 'Investment Club',
      members: ['user-3'],
    }),
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

const renderAdminPage = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AdminPage />
  </MemoryRouter>
)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDocs.mockResolvedValue({ docs: mockUsers })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    // Mock window.open for PDF
    mockWindowOpen.mockReturnValue({
      document: {
        write: mockDocumentWrite,
        close: mockDocumentClose,
      },
      focus: vi.fn(),
      print: mockPrint,
      onload: null,
    })
    global.window.open = mockWindowOpen
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic rendering', () => {
    it('renders the Admin Dashboard heading', async () => {
      renderAdminPage()
      expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
    })

    it('displays fetched users in the table', async () => {
      renderAdminPage()
      expect(await screen.findByText('Alice Dlamini')).toBeInTheDocument()
      expect(screen.getByText('Bob Mokoena')).toBeInTheDocument()
      expect(screen.getByText('Carol Admin')).toBeInTheDocument()
    })

    it('displays stat cards with correct counts', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')
      
      expect(screen.getByText('Total users')).toBeInTheDocument()
      expect(screen.getByText('Treasurers')).toBeInTheDocument()
      expect(screen.getByText('Members')).toBeInTheDocument()
      expect(screen.getByText('Admins')).toBeInTheDocument()
    })

    it('shows loading state while fetching users', async () => {
      mockGetDocs.mockImplementationOnce(() => new Promise(() => {}))
      renderAdminPage()
      expect(screen.getByText('Loading users…')).toBeInTheDocument()
    })
  })

  describe('User filtering and pagination', () => {
    it('filters users by search input', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      fireEvent.change(searchInput, { target: { value: 'Bob' } })

      expect(screen.getByText('Bob Mokoena')).toBeInTheDocument()
      expect(screen.queryByText('Alice Dlamini')).not.toBeInTheDocument()
    })

    it('shows no users found message when search has no results', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      fireEvent.change(screen.getByPlaceholderText('Search by name or email…'), {
        target: { value: 'zzznomatch' },
      })

      expect(screen.getByText('No users found.')).toBeInTheDocument()
    })

    it('resets to page 1 when search changes', async () => {
      // Create many users to test pagination
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i}`,
        data: () => ({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          role: 'user',
          createdAt: { toDate: () => new Date() },
        }),
      }))
      mockGetDocs.mockResolvedValue({ docs: manyUsers })

      renderAdminPage()
      await screen.findByText('User 0')
      
      // Go to page 2
      const nextButton = screen.getByText('Next →')
      fireEvent.click(nextButton)
      
      // Change search
      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      fireEvent.change(searchInput, { target: { value: 'User' } })
      
      // Should be back on page 1 showing first users
      expect(screen.getByText('User 0')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates to /create-group when Create group is clicked', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      fireEvent.click(screen.getByText('Create group'))
      expect(mockNavigate).toHaveBeenCalledWith('/create-group')
    })

    it('navigates to /configure-group when Configure group is clicked', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      fireEvent.click(screen.getByText('Configure group'))
      expect(mockNavigate).toHaveBeenCalledWith('/configure-group')
    })
  })

  describe('Role management', () => {
    it('calls updateDoc when role is changed and confirmed', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'treasurer' } })

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled()
      })
    })

    it('shows saving indicator while updating role', async () => {
      mockUpdateDoc.mockImplementationOnce(() => new Promise(() => {}))
      
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'treasurer' } })

      expect(await screen.findByText('Saving…')).toBeInTheDocument()
    })

    it('shows alert when role update fails', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Update failed'))
      
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'treasurer' } })

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to update role. Please try again.')
      })
    })

    it('does not update role if user cancels confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'treasurer' } })

      await waitFor(() => {
        expect(mockUpdateDoc).not.toHaveBeenCalled()
      })
    })
  })

  describe('Reports tab', () => {
    beforeEach(() => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: mockUsers })
        .mockResolvedValueOnce({ docs: mockContributions })
        .mockResolvedValueOnce({ docs: mockGroups })
    })

 // Fixed test 1

    it('filters contributions by status in reports tab', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const reportsTab = screen.getByText('📊 Platform Reports')
      fireEvent.click(reportsTab)

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      const paidButton = screen.getByText('Paid')
      fireEvent.click(paidButton)
    })

    it('filters contributions by group in reports tab', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const reportsTab = screen.getByText('📊 Platform Reports')
      fireEvent.click(reportsTab)

      await waitFor(() => {
        expect(screen.getByText('All Groups')).toBeInTheDocument()
      })

      const groupSelect = screen.getByRole('combobox', { name: '' })
      fireEvent.change(groupSelect, { target: { value: 'group-1' } })
    })

    it('sorts contributions by amount', async () => {
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const reportsTab = screen.getByText('📊 Platform Reports')
      fireEvent.click(reportsTab)

      await waitFor(() => {
        expect(screen.getByText('Amount')).toBeInTheDocument()
      })

      const amountHeader = screen.getByText('Amount')
      fireEvent.click(amountHeader)
      fireEvent.click(amountHeader) // Sort descending then ascending
    })

    

 

    it('shows loading state when fetching reports data', async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: mockUsers })
        .mockImplementationOnce(() => new Promise(() => {}))
      
      renderAdminPage()
      await screen.findByText('Alice Dlamini')

      const reportsTab = screen.getByText('📊 Platform Reports')
      fireEvent.click(reportsTab)

      expect(screen.getByText('Loading platform data…')).toBeInTheDocument()
    })

    
  })

  describe('Error handling', () => {
    it('handles Firestore error when fetching users', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'))
      
      renderAdminPage()
      
      await waitFor(() => {
        expect(screen.getByText('Loading users…')).toBeInTheDocument()
      })
    })

   
  })
})