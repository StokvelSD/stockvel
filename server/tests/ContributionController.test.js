// tests/ContributionController.test.js

const mockCollection = jest.fn()
const mockDb = { collection: mockCollection }

jest.mock('../firebase/admin', () => ({
  getFirestore: jest.fn(() => mockDb)
}))

const {
  getUserContributions,
  getTotPaid,
  getContributionsByGroup
} = require('../controllers/contributionsController')

const { getFirestore } = require('../firebase/admin')

describe('Contributions Controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()
    getFirestore.mockReturnValue(mockDb)

    req = {
      user: { uid: 'test-user-123' },
      query: {}
    }

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    }
  })

  const makeChain = (docs) => ({
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ forEach: (cb) => docs.forEach(cb) })
  })

  const makeErrorChain = (message) => ({
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockRejectedValue(new Error(message))
  })

  // ── getUserContributions ─────────────────────────────────────────────────

  describe('getUserContributions', () => {
    it('should return contributions for a user', async () => {
      const mockDate = { toDate: () => new Date('2025-01-01') }
      const docs = [
        { id: '1', data: () => ({ amount: 500, groupId: 'g1', groupName: 'Club A', status: 'paid', createdAt: mockDate }) },
        { id: '2', data: () => ({ amount: 750, groupId: 'g2', groupName: 'Club B', status: 'pending', createdAt: mockDate }) }
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getUserContributions(req, res)

      expect(mockCollection).toHaveBeenCalledWith('payments')
      const body = res.json.mock.calls[0][0]
      expect(body).toHaveLength(2)
      expect(body[0]).toMatchObject({ id: '1', amount: 500, groupName: 'Club A' })
    })

    it('should return empty array when user has no contributions', async () => {
      mockCollection.mockReturnValue(makeChain([]))

      await getUserContributions(req, res)

      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should sort contributions by date descending', async () => {
      const docs = [
        { id: '1', data: () => ({ amount: 100, createdAt: { toDate: () => new Date('2025-01-01') } }) },
        { id: '2', data: () => ({ amount: 200, createdAt: { toDate: () => new Date('2025-06-01') } }) }
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getUserContributions(req, res)

      const body = res.json.mock.calls[0][0]
      expect(body[0].amount).toBe(200) // June first (most recent)
      expect(body[1].amount).toBe(100)
    })

    it('should return 500 on database error', async () => {
      mockCollection.mockReturnValue(makeErrorChain('DB error'))

      await getUserContributions(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to fetch contributions' })
      )
    })
  })

  // ── getTotPaid ───────────────────────────────────────────────────────────

  describe('getTotPaid', () => {
    it('should return total paid amount and count', async () => {
      const docs = [
        { id: '1', data: () => ({ amount: 500, groupId: 'g1', groupName: 'Club A', status: 'paid' }) },
        { id: '2', data: () => ({ amount: 300, groupId: 'g1', groupName: 'Club A', status: 'paid' }) }
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getTotPaid(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 800, count: 2 })
      )
    })

    it('should return zero total when no paid contributions', async () => {
      mockCollection.mockReturnValue(makeChain([]))

      await getTotPaid(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 0, count: 0, contributions: [] })
      )
    })

    it('should default amount to 0 when missing', async () => {
      const docs = [
        { id: '1', data: () => ({ groupId: 'g1', status: 'paid' }) } // no amount
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getTotPaid(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 0, count: 1 })
      )
    })

    it('should return 500 on database error', async () => {
      mockCollection.mockReturnValue(makeErrorChain('DB error'))

      await getTotPaid(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate total paid' })
      )
    })
  })

  // ── getContributionsByGroup ──────────────────────────────────────────────

  describe('getContributionsByGroup', () => {
    it('should return contributions grouped by group with totals', async () => {
      const docs = [
        { id: '1', data: () => ({ amount: 500, groupId: 'g1', groupName: 'Savings Group', status: 'paid' }) },
        { id: '2', data: () => ({ amount: 300, groupId: 'g1', groupName: 'Savings Group', status: 'paid' }) },
        { id: '3', data: () => ({ amount: 1000, groupId: 'g2', groupName: 'Investment Club', status: 'paid' }) }
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([
        { groupId: 'g1', groupName: 'Savings Group', totalPaid: 800, contributionCount: 2 },
        { groupId: 'g2', groupName: 'Investment Club', totalPaid: 1000, contributionCount: 1 }
      ])
    })

    it('should return empty array when no contributions', async () => {
      mockCollection.mockReturnValue(makeChain([]))

      await getContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should default groupName to Unknown when missing', async () => {
      const docs = [
        { id: '1', data: () => ({ amount: 500, groupId: 'g1', status: 'paid' }) }
      ]

      mockCollection.mockReturnValue(makeChain(docs))

      await getContributionsByGroup(req, res)

      const body = res.json.mock.calls[0][0]
      expect(body[0].groupName).toBe('Unknown')
    })

    it('should return 500 on database error', async () => {
      mockCollection.mockReturnValue(makeErrorChain('DB error'))

      await getContributionsByGroup(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to fetch grouped contributions' })
      )
    })
  })
})