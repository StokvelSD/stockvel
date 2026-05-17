// tests/ContributionController.test.js

// Mock must match the actual export: module.exports = db (bare object, not { db })
jest.mock('../firebase/admin', () => ({
  collection: jest.fn()
}))

const {
  getPaidContributions,
  getUserContributions,
  getUserContributionsByGroup
} = require('../controllers/contributionsController')

// Import the mock directly — it IS the db
const db = require('../firebase/admin')

describe('Contributions Controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      user: { uid: 'test-user-123' },
      query: {}
    }

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    }
  })

  describe('getPaidContributions', () => {
    it('should return paid contributions for a specific group and user', async () => {
      req.query.groupId = 'group-123'

      const mockDocs = {
        forEach: (callback) => {
          callback({ id: '1', data: () => ({ amount: 500, status: 'paid', userId: 'test-user-123', groupId: 'group-123' }) })
          callback({ id: '2', data: () => ({ amount: 750, status: 'paid', userId: 'test-user-123', groupId: 'group-123' }) })
        }
      }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getPaidContributions(req, res)

      expect(db.collection).toHaveBeenCalledWith('contributions')
      expect(res.json).toHaveBeenCalledWith([
        { id: '1', amount: 500, status: 'paid', userId: 'test-user-123', groupId: 'group-123' },
        { id: '2', amount: 750, status: 'paid', userId: 'test-user-123', groupId: 'group-123' }
      ])
    })

    it('should return empty array when no paid contributions exist', async () => {
      req.query.groupId = 'group-123'

      const mockDocs = { forEach: (callback) => {} }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getPaidContributions(req, res)

      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should handle database error', async () => {
      req.query.groupId = 'group-123'

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      })

      await getPaidContributions(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch contributions' })
    })
  })

  describe('getUserContributions', () => {
    it('should return all contributions for a user', async () => {
      const mockDocs = {
        forEach: (callback) => {
          callback({ id: '1', data: () => ({ amount: 500, status: 'paid', userId: 'test-user-123', groupId: 'group-1' }) })
          callback({ id: '2', data: () => ({ amount: 750, status: 'pending', userId: 'test-user-123', groupId: 'group-2' }) })
        }
      }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributions(req, res)

      expect(db.collection).toHaveBeenCalledWith('contributions')
      expect(res.json).toHaveBeenCalledWith([
        { id: '1', amount: 500, status: 'paid', userId: 'test-user-123', groupId: 'group-1' },
        { id: '2', amount: 750, status: 'pending', userId: 'test-user-123', groupId: 'group-2' }
      ])
    })

    it('should return empty array when user has no contributions', async () => {
      const mockDocs = { forEach: (callback) => {} }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributions(req, res)

      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should handle database error', async () => {
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('Database error'))
      })

      await getUserContributions(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch contributions' })
    })
  })

  describe('getUserContributionsByGroup', () => {
    it('should return contributions grouped by group', async () => {
      const mockDocs = {
        forEach: (callback) => {
          callback({ data: () => ({ amount: 500, groupId: 'group-1', groupName: 'Savings Group' }) })
          callback({ data: () => ({ amount: 300, groupId: 'group-1', groupName: 'Savings Group' }) })
          callback({ data: () => ({ amount: 1000, groupId: 'group-2', groupName: 'Investment Club' }) })
        }
      }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([
        { groupId: 'group-1', groupName: 'Savings Group', totalPaid: 800 },
        { groupId: 'group-2', groupName: 'Investment Club', totalPaid: 1000 }
      ])
    })

    it('should return empty array when user has no contributions', async () => {
      const mockDocs = { forEach: (callback) => {} }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should handle contributions without groupName', async () => {
      const mockDocs = {
        forEach: (callback) => {
          callback({ data: () => ({ amount: 500, groupId: 'group-1' }) })
          callback({ data: () => ({ amount: 300, groupId: 'group-1' }) })
        }
      }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([
        { groupId: 'group-1', groupName: 'Unknown', totalPaid: 800 }
      ])
    })

    it('should handle contributions without amount', async () => {
      const mockDocs = {
        forEach: (callback) => {
          callback({ data: () => ({ groupId: 'group-1', groupName: 'Savings Group' }) })
          callback({ data: () => ({ amount: 300, groupId: 'group-1', groupName: 'Savings Group' }) })
        }
      }

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDocs)
      })

      await getUserContributionsByGroup(req, res)

      expect(res.json).toHaveBeenCalledWith([
        { groupId: 'group-1', groupName: 'Savings Group', totalPaid: 300 }
      ])
    })

    it('should handle database error', async () => {
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('Database error'))
      })

      await getUserContributionsByGroup(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch grouped contributions' })
    })
  })
})