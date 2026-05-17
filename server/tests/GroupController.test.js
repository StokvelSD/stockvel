// tests/groupController.test.js

// Mock firebase-admin for the inline require inside joinGroup
jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      arrayUnion: jest.fn((...args) => ({ _arrayUnion: args }))
    }
  }
}))

// Mock db — bare export matching module.exports = db
jest.mock('../firebase/admin', () => ({
  collection: jest.fn(),
  runTransaction: jest.fn()
}))

const {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  scheduleMeeting,
  addMeetingMinutes,
  sendAnnouncement,
  getGroupAnnouncements,
  getGroupMeetings,
  getMeetingById
} = require('../controllers/groupController')

const db = require('../firebase/admin')

// ─── helpers ────────────────────────────────────────────────────────────────

const makeDoc = (id, data, exists = true) => ({
  id,
  exists,
  data: () => data
})

const makeSnapshot = (docs) => ({
  docs,
  empty: docs.length === 0
})

const makeChain = (overrides = {}) => {
  const chain = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(makeSnapshot([])),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    doc: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue({}),
    ...overrides
  }
  // make each method return the chain so calls can be chained freely
  chain.where.mockReturnValue(chain)
  chain.orderBy.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  return chain
}

// ─── setup ───────────────────────────────────────────────────────────────────

let req, res

beforeEach(() => {
  jest.clearAllMocks()

  req = { body: {}, params: {}, query: {}, user: { uid: 'admin-uid', id: 'admin-uid' } }
  res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
  }
})

// ════════════════════════════════════════════════════════════════════════════
// createGroup
// ════════════════════════════════════════════════════════════════════════════

describe('createGroup', () => {
  it('should return 400 when groupName is missing', async () => {
    req.body = { contributionAmount: 500 }
    await createGroup(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Group name is required' })
  })

  it('should return 400 when contributionAmount is 0 or negative', async () => {
    req.body = { groupName: 'Savings Club', contributionAmount: 0 }
    await createGroup(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Contribution amount must be greater than 0' })
  })

  it('should create a group without userId and return 201', async () => {
    req.body = { groupName: 'Savings Club', contributionAmount: 500 }

    const chain = makeChain()
    db.collection.mockReturnValue(chain)

    await createGroup(req, res)

    expect(db.collection).toHaveBeenCalledWith('groups')
    expect(chain.add).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Group created successfully', groupId: 'new-doc-id' })
    )
  })

  it('should add group to user document when userId is provided and user exists', async () => {
    req.body = { groupName: 'Savings Club', contributionAmount: 500, userId: 'user-1' }

    const userDoc = makeDoc('user-1', { groups: ['existing-group'] })
    const userChain = makeChain({
      get: jest.fn().mockResolvedValue(userDoc)
    })

    const groupChain = makeChain()

    // First call → groups collection, second call → users collection
    db.collection
      .mockReturnValueOnce(groupChain)   // groups.add()
      .mockReturnValueOnce(userChain)    // users.doc().get() / update()

    await createGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(userChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ groups: expect.arrayContaining(['existing-group', 'new-doc-id']) })
    )
  })

  it('should return 500 on database error', async () => {
    req.body = { groupName: 'Savings Club', contributionAmount: 500 }
    const chain = makeChain({ add: jest.fn().mockRejectedValue(new Error('DB error')) })
    db.collection.mockReturnValue(chain)

    await createGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create group' })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getGroups
// ════════════════════════════════════════════════════════════════════════════

describe('getGroups', () => {
  it('should return all groups with dates converted', async () => {
    const mockDate = new Date('2025-01-01')
    const docs = [
      makeDoc('g1', { groupName: 'Club A', contributionAmount: 500, createdAt: { toDate: () => mockDate } }),
      makeDoc('g2', { groupName: 'Club B', contributionAmount: 800, createdAt: { toDate: () => mockDate } })
    ]
    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeSnapshot(docs)) })
    db.collection.mockReturnValue(chain)

    await getGroups(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({ id: 'g1', groupName: 'Club A', createdAt: mockDate })
  })

  it('should return empty array when no groups exist', async () => {
    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeSnapshot([])) })
    db.collection.mockReturnValue(chain)

    await getGroups(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('should return 500 on database error', async () => {
    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await getGroups(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch groups' })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getGroupById
// ════════════════════════════════════════════════════════════════════════════

describe('getGroupById', () => {
  it('should return 400 when groupId is missing', async () => {
    req.params = {}
    await getGroupById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 when group does not exist', async () => {
    req.params = { groupId: 'ghost' }
    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await getGroupById(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Group not found' })
  })

  it('should return the group when found', async () => {
    req.params = { groupId: 'g1' }
    const mockDate = new Date('2025-01-01')
    const doc = makeDoc('g1', { groupName: 'Club A', createdAt: { toDate: () => mockDate } })
    const chain = makeChain({ get: jest.fn().mockResolvedValue(doc) })
    db.collection.mockReturnValue(chain)

    await getGroupById(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1', groupName: 'Club A' }))
  })

  it('should return 500 on database error', async () => {
    req.params = { groupId: 'g1' }
    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await getGroupById(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// joinGroup
// ════════════════════════════════════════════════════════════════════════════

describe('joinGroup', () => {
  it('should return 400 when userId is missing', async () => {
    req.params = { groupId: 'g1' }
    req.body = {}
    await joinGroup(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'User ID is required' })
  })

  it('should return 404 when user does not exist', async () => {
    req.params = { groupId: 'g1' }
    req.body = { userId: 'u1' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('u1', {}, false)) })
    db.collection.mockReturnValue(chain)

    await joinGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' })
  })

  it('should return 201 when user joins successfully', async () => {
    req.params = { groupId: 'g1' }
    req.body = { userId: 'u1' }

    const userDoc = makeDoc('u1', { name: 'Alice' })
    const groupDoc = makeDoc('g1', { members: [], maxMembers: 10 })

    const userChain = makeChain({ get: jest.fn().mockResolvedValue(userDoc) })
    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })

    db.collection
      .mockReturnValueOnce(userChain)   // users.doc(userId).get()
      .mockReturnValueOnce(groupChain)  // groups.doc(groupId) reference for transaction

    db.runTransaction.mockImplementation(async (fn) => {
      await fn({
        get: jest.fn().mockResolvedValue(groupDoc),
        update: jest.fn()
      })
    })

    await joinGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ message: 'Successfully joined the group!' })
  })

  it('should return 400 when user is already a member', async () => {
    req.params = { groupId: 'g1' }
    req.body = { userId: 'u1' }

    const userDoc = makeDoc('u1', { name: 'Alice' })
    const groupDoc = makeDoc('g1', { members: ['u1'], maxMembers: 10 })

    const userChain = makeChain({ get: jest.fn().mockResolvedValue(userDoc) })
    const groupChain = makeChain()
    db.collection
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(groupChain)

    db.runTransaction.mockImplementation(async (fn) => {
      await fn({
        get: jest.fn().mockResolvedValue(groupDoc),
        update: jest.fn()
      })
    })

    await joinGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'You are already a member of this group' })
  })

  it('should return 400 when group is full', async () => {
    req.params = { groupId: 'g1' }
    req.body = { userId: 'u1' }

    const userDoc = makeDoc('u1', { name: 'Alice' })
    const groupDoc = makeDoc('g1', { members: ['u2', 'u3'], maxMembers: 2 })

    const userChain = makeChain({ get: jest.fn().mockResolvedValue(userDoc) })
    const groupChain = makeChain()
    db.collection
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(groupChain)

    db.runTransaction.mockImplementation(async (fn) => {
      await fn({
        get: jest.fn().mockResolvedValue(groupDoc),
        update: jest.fn()
      })
    })

    await joinGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Group is full' })
  })

  it('should return 500 on unexpected error', async () => {
    req.params = { groupId: 'g1' }
    req.body = { userId: 'u1' }

    const userChain = makeChain({ get: jest.fn().mockRejectedValue(new Error('DB crash')) })
    db.collection.mockReturnValue(userChain)

    await joinGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// scheduleMeeting
// ════════════════════════════════════════════════════════════════════════════

describe('scheduleMeeting', () => {
  it('should return 400 when required fields are missing', async () => {
    req.params = { groupId: 'g1' }
    req.body = { title: 'AGM' }  // missing date, location, agenda
    await scheduleMeeting(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'All meeting details are required' })
  })

  it('should return 404 when group does not exist', async () => {
    req.params = { groupId: 'ghost' }
    req.body = { title: 'AGM', date: '2025-01-01', location: 'Hall', agenda: 'Discuss funds' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await scheduleMeeting(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Group not found' })
  })

  it('should create a meeting and return 201', async () => {
    req.params = { groupId: 'g1' }
    req.body = { title: 'AGM', date: '2025-01-01', location: 'Hall', agenda: 'Discuss funds' }

    const groupDoc = makeDoc('g1', { groupName: 'Club A' })
    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })
    const meetingsChain = makeChain()

    db.collection
      .mockReturnValueOnce(groupChain)    // groups.doc(groupId).get()
      .mockReturnValueOnce(meetingsChain) // meetings.add()

    await scheduleMeeting(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Meeting scheduled successfully', meetingId: 'new-doc-id' })
    )
  })

  it('should return 500 on database error', async () => {
    req.params = { groupId: 'g1' }
    req.body = { title: 'AGM', date: '2025-01-01', location: 'Hall', agenda: 'Discuss funds' }

    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await scheduleMeeting(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// addMeetingMinutes
// ════════════════════════════════════════════════════════════════════════════

describe('addMeetingMinutes', () => {
  it('should return 400 when minutes are missing', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }
    req.body = { minutes: '   ' }
    await addMeetingMinutes(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting minutes are required' })
  })

  it('should return 404 when meeting does not exist', async () => {
    req.params = { groupId: 'g1', meetingId: 'ghost' }
    req.body = { minutes: 'We discussed savings.' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await addMeetingMinutes(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return 400 when meeting belongs to a different group', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }
    req.body = { minutes: 'We discussed savings.' }

    const meetingDoc = makeDoc('m1', { groupId: 'g-OTHER' })
    const chain = makeChain({ get: jest.fn().mockResolvedValue(meetingDoc) })
    db.collection.mockReturnValue(chain)

    await addMeetingMinutes(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting does not belong to the specified group' })
  })

  it('should update minutes and return 200', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }
    req.body = { minutes: 'We discussed savings.' }

    const meetingDoc = makeDoc('m1', { groupId: 'g1' })
    const chain = makeChain({ get: jest.fn().mockResolvedValue(meetingDoc) })
    db.collection.mockReturnValue(chain)

    await addMeetingMinutes(req, res)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ minutes: 'We discussed savings.', status: 'completed' })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ message: 'Meeting minutes added successfully' })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// sendAnnouncement
// ════════════════════════════════════════════════════════════════════════════

describe('sendAnnouncement', () => {
  it('should return 400 when title or message is missing', async () => {
    req.params = { groupId: 'g1' }
    req.body = { title: 'Hello' }  // no message
    await sendAnnouncement(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Title and message are required' })
  })

  it('should return 404 when group does not exist', async () => {
    req.params = { groupId: 'ghost' }
    req.body = { title: 'Hello', message: 'Meeting moved.' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await sendAnnouncement(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should create announcement and return 201', async () => {
    req.params = { groupId: 'g1' }
    req.body = { title: 'Hello', message: 'Meeting moved.' }

    const groupDoc = makeDoc('g1', { groupName: 'Club A' })
    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })
    const announcementsChain = makeChain()

    db.collection
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(announcementsChain)

    await sendAnnouncement(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Announcement sent successfully', announcementId: 'new-doc-id' })
    )
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getGroupAnnouncements
// ════════════════════════════════════════════════════════════════════════════

describe('getGroupAnnouncements', () => {
  it('should return 404 when group does not exist', async () => {
    req.params = { groupId: 'ghost' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await getGroupAnnouncements(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return announcements with groupName attached', async () => {
    req.params = { groupId: 'g1' }

    const groupDoc = makeDoc('g1', { groupName: 'Club A' })
    const announcementDocs = [
      makeDoc('a1', { title: 'Hello', message: 'Hi', groupId: 'g1' }),
      makeDoc('a2', { title: 'Reminder', message: 'Pay up', groupId: 'g1' })
    ]

    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })
    const announcementsChain = makeChain({
      get: jest.fn().mockResolvedValue(makeSnapshot(announcementDocs))
    })

    db.collection
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(announcementsChain)

    await getGroupAnnouncements(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body).toHaveLength(2)
    expect(body[0].groupName).toBe('Club A')
  })

  it('should return 500 on database error', async () => {
    req.params = { groupId: 'g1' }
    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await getGroupAnnouncements(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getGroupMeetings
// ════════════════════════════════════════════════════════════════════════════

describe('getGroupMeetings', () => {
  it('should return 404 when group does not exist', async () => {
    req.params = { groupId: 'ghost' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await getGroupMeetings(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return meetings sorted by date', async () => {
    req.params = { groupId: 'g1' }

    const mockDate1 = new Date('2025-03-01')
    const mockDate2 = new Date('2025-01-01')
    const groupDoc = makeDoc('g1', { groupName: 'Club A' })
    const meetingDocs = [
      makeDoc('m1', { title: 'March', groupId: 'g1', date: { toDate: () => mockDate1 }, createdAt: { toDate: () => mockDate1 }, status: 'scheduled' }),
      makeDoc('m2', { title: 'January', groupId: 'g1', date: { toDate: () => mockDate2 }, createdAt: { toDate: () => mockDate2 }, status: 'scheduled' })
    ]

    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })
    const meetingsChain = makeChain({ get: jest.fn().mockResolvedValue(makeSnapshot(meetingDocs)) })

    db.collection
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(meetingsChain)

    await getGroupMeetings(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body[0].title).toBe('January')  // sorted ascending by date
    expect(body[1].title).toBe('March')
  })

  it('should filter meetings by status when status query is provided', async () => {
    req.params = { groupId: 'g1' }
    req.query = { status: 'completed' }

    const mockDate = new Date('2025-01-01')
    const groupDoc = makeDoc('g1', { groupName: 'Club A' })
    const meetingDocs = [
      makeDoc('m1', { title: 'Done', groupId: 'g1', status: 'completed', date: { toDate: () => mockDate }, createdAt: { toDate: () => mockDate } })
    ]

    const groupChain = makeChain({ get: jest.fn().mockResolvedValue(groupDoc) })
    const meetingsChain = makeChain({ get: jest.fn().mockResolvedValue(makeSnapshot(meetingDocs)) })

    db.collection
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(meetingsChain)

    await getGroupMeetings(req, res)

    // The second where() call should have been made with status filter
    expect(meetingsChain.where).toHaveBeenCalledWith('status', '==', 'completed')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('should return 500 on database error', async () => {
    req.params = { groupId: 'g1' }
    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await getGroupMeetings(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getMeetingById
// ════════════════════════════════════════════════════════════════════════════

describe('getMeetingById', () => {
  it('should return 400 when groupId or meetingId is missing', async () => {
    req.params = { groupId: 'g1' }  // no meetingId
    await getMeetingById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 when meeting does not exist', async () => {
    req.params = { groupId: 'g1', meetingId: 'ghost' }

    const chain = makeChain({ get: jest.fn().mockResolvedValue(makeDoc('ghost', {}, false)) })
    db.collection.mockReturnValue(chain)

    await getMeetingById(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting not found' })
  })

  it('should return 400 when meeting belongs to a different group', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }

    const meetingDoc = makeDoc('m1', { groupId: 'g-OTHER', title: 'AGM' })
    const chain = makeChain({ get: jest.fn().mockResolvedValue(meetingDoc) })
    db.collection.mockReturnValue(chain)

    await getMeetingById(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting does not belong to the specified group' })
  })

  it('should return the meeting when found', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }

    const mockDate = new Date('2025-01-01')
    const meetingDoc = makeDoc('m1', {
      groupId: 'g1',
      title: 'AGM',
      date: { toDate: () => mockDate },
      createdAt: { toDate: () => mockDate }
    })

    const chain = makeChain({ get: jest.fn().mockResolvedValue(meetingDoc) })
    db.collection.mockReturnValue(chain)

    await getMeetingById(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', title: 'AGM' }))
  })

  it('should return 500 on database error', async () => {
    req.params = { groupId: 'g1', meetingId: 'm1' }
    const chain = makeChain({ get: jest.fn().mockRejectedValue(new Error('fail')) })
    db.collection.mockReturnValue(chain)

    await getMeetingById(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})