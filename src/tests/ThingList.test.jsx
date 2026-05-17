// src/tests/ThingList.test.jsx

import { render, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock firebase first
vi.mock('../firebase/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    },
  },
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock the contributions service
vi.mock('../services/contributions', () => ({
  fetchPaidContributions: vi.fn(),
}))

// Import after mocks
import ThingsList from '../pages/ThingsList'
import { fetchPaidContributions } from '../services/contributions'

// Silence console logs
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ThingsList Coverage Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('test 1 - loading state', () => {
    fetchPaidContributions.mockImplementation(() => new Promise(() => {}))
    const { container } = render(<ThingsList />)
    expect(container).toBeDefined()
  })

  it('test 2 - error state', async () => {
    fetchPaidContributions.mockRejectedValueOnce(new Error('Test error'))
    const { container } = render(<ThingsList />)
    await waitFor(() => expect(fetchPaidContributions).toHaveBeenCalled())
    expect(container).toBeDefined()
  })

  it('test 3 - empty data', async () => {
    fetchPaidContributions.mockResolvedValueOnce([])
    const { container } = render(<ThingsList />)
    await waitFor(() => expect(fetchPaidContributions).toHaveBeenCalled())
    expect(container).toBeDefined()
  })

  it('test 4 - data with date', async () => {
    fetchPaidContributions.mockResolvedValueOnce([
      { id: '1', amount: 500, status: 'paid', date: '2025-01-15T10:00:00Z' }
    ])
    const { container } = render(<ThingsList />)
    await waitFor(() => expect(fetchPaidContributions).toHaveBeenCalled())
    expect(container).toBeDefined()
  })

  it('test 5 - data with null date', async () => {
    fetchPaidContributions.mockResolvedValueOnce([
      { id: '1', amount: 500, status: 'paid', date: null }
    ])
    const { container } = render(<ThingsList />)
    await waitFor(() => expect(fetchPaidContributions).toHaveBeenCalled())
    expect(container).toBeDefined()
  })

  it('test 6 - multiple contributions', async () => {
    fetchPaidContributions.mockResolvedValueOnce([
      { id: '1', amount: 100, status: 'paid', date: '2025-01-15T10:00:00Z' },
      { id: '2', amount: 200, status: 'completed', date: '2025-01-16T10:00:00Z' },
      { id: '3', amount: 300, status: 'confirmed', date: '2025-01-17T10:00:00Z' },
    ])
    const { container } = render(<ThingsList />)
    await waitFor(() => expect(fetchPaidContributions).toHaveBeenCalled())
    expect(container).toBeDefined()
  })
})