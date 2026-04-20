// server/tests/groupController.test.js

const request = require('supertest');
const express = require('express');

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAdd        = jest.fn();
const mockGet        = jest.fn();
const mockUpdate     = jest.fn();
const mockWhere      = jest.fn();
const mockOrderBy    = jest.fn();
const mockLimit      = jest.fn();
const mockDoc        = jest.fn();
const mockCollection = jest.fn();

// Chainable where mock
const makeWhereMock = (finalGet) => {
    const whereMock = {
        where:   jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit:   jest.fn().mockReturnThis(),
        get:     finalGet,
    };
    return whereMock;
};

jest.mock('../firebase/admin', () => {
    const runTransaction = jest.fn();
    const collectionMock = jest.fn();
    const db = { collection: collectionMock, runTransaction };
    return db;
});

jest.mock('firebase-admin', () => ({
    firestore: {
        FieldValue: { arrayUnion: jest.fn((val) => ({ arrayUnion: val })) },
    },
}));

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const groupRoutes = require('../routes/groups');
app.use('/api/groups', groupRoutes);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const db = require('../firebase/admin');

const mockGroupData = {
    groupName:          'Soweto Savers',
    contributionAmount: 500,
    description:        'A test group',
    maxMembers:         10,
    meetingFrequency:   'monthly',
    duration:           12,
    payoutOrder:        'rotation',
    members:            ['user-1'],
    createdAt:          { toDate: () => new Date('2026-01-01') },
};

const mockMeetingData = {
    groupId:   'group-1',
    title:     'Monthly Meeting',
    date:      { toDate: () => new Date('2026-06-01') },
    agenda:    'Discuss contributions',
    status:    'scheduled',
    createdBy: 'admin',
    createdAt: { toDate: () => new Date('2026-01-01') },
    completedAt: null,
};

const mockAnnouncementData = {
    groupId:   'group-1',
    title:     'Important Update',
    message:   'Please pay contributions by Friday',
    createdBy: 'admin',
    createdAt: { toDate: () => new Date('2026-01-01') },
    readBy:    [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/groups — createGroup', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given valid group data with a userId,
    // When a group is created,
    // Then the group is saved and 201 is returned.
    it('creates a group successfully with userId', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'groups') return {
                add: jest.fn().mockResolvedValue({ id: 'new-group-id' }),
            };
            if (col === 'users') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ groups: [] }),
                    }),
                    update: jest.fn().mockResolvedValue({}),
                }),
            };
        });

        const res = await request(app)
            .post('/api/groups')
            .send({
                groupName:          'Soweto Savers',
                contributionAmount: 500,
                description:        'Test group',
                maxMembers:         10,
                meetingFrequency:   'monthly',
                duration:           12,
                payoutOrder:        'rotation',
                userId:             'user-1',
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Group created successfully');
        expect(res.body.groupId).toBe('new-group-id');
    });

    // Given a request with no groupName,
    // When the group creation is attempted,
    // Then 400 is returned.
    it('returns 400 if groupName is missing', async () => {
        const res = await request(app)
            .post('/api/groups')
            .send({ contributionAmount: 500 });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Group name is required');
    });

    // Given a request with contributionAmount of 0,
    // When the group creation is attempted,
    // Then 400 is returned.
    it('returns 400 if contributionAmount is 0 or negative', async () => {
        const res = await request(app)
            .post('/api/groups')
            .send({ groupName: 'Test', contributionAmount: 0 });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Contribution amount must be greater than 0');
    });

    // Given Firestore throws an error,
    // When the group creation fails,
    // Then 500 is returned.
    it('returns 500 if Firestore throws', async () => {
        db.collection.mockImplementation(() => ({
            add: jest.fn().mockRejectedValue(new Error('Firestore down')),
        }));

        const res = await request(app)
            .post('/api/groups')
            .send({ groupName: 'Test', contributionAmount: 500 });

        expect(res.statusCode).toBe(500);
    });
});

describe('GET /api/groups — getGroups', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given groups exist in Firestore,
    // When a request is made to fetch groups,
    // Then all groups are returned with 200.
    it('returns all groups successfully', async () => {
        db.collection.mockReturnValue({
            get: jest.fn().mockResolvedValue({
                docs: [
                    { id: 'group-1', data: () => mockGroupData },
                    { id: 'group-2', data: () => ({ ...mockGroupData, groupName: 'Cape Town Circle' }) },
                ],
            }),
        });

        const res = await request(app).get('/api/groups');

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].groupName).toBe('Soweto Savers');
    });

    // Given Firestore throws,
    // When groups are fetched,
    // Then 500 is returned.
    it('returns 500 if Firestore throws', async () => {
        db.collection.mockReturnValue({
            get: jest.fn().mockRejectedValue(new Error('Firestore down')),
        });

        const res = await request(app).get('/api/groups');
        expect(res.statusCode).toBe(500);
    });
});

describe('GET /api/groups/:groupId — getGroupById', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given a valid groupId,
    // When the group is fetched,
    // Then the group data is returned with 200.
    it('returns group by ID successfully', async () => {
        db.collection.mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id:     'group-1',
                    data:   () => mockGroupData,
                }),
            }),
        });

        const res = await request(app).get('/api/groups/group-1');

        expect(res.statusCode).toBe(200);
        expect(res.body.groupName).toBe('Soweto Savers');
    });

    // Given a groupId that doesn't exist,
    // When the group is fetched,
    // Then 404 is returned.
    it('returns 404 if group does not exist', async () => {
        db.collection.mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false }),
            }),
        });

        const res = await request(app).get('/api/groups/nonexistent');
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('Group not found');
    });
});

describe('POST /api/groups/:groupId/join — joinGroup', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given a valid userId and groupId with space,
    // When the user joins,
    // Then 201 is returned.
    it('joins a group successfully', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'users') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: true }),
                }),
            };
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({}),
            };
        });

        db.runTransaction = jest.fn().mockImplementation(async (fn) => {
            await fn({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data:   () => ({ members: [], maxMembers: 10 }),
                }),
                update: jest.fn(),
            });
        });

        const res = await request(app)
            .post('/api/groups/group-1/join')
            .send({ userId: 'user-2' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Successfully joined the group!');
    });

    // Given userId is missing,
    // When join is attempted,
    // Then 400 is returned.
    it('returns 400 if userId is missing', async () => {
        const res = await request(app)
            .post('/api/groups/group-1/join')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('User ID is required');
    });

    // Given the user is already a member,
    // When join is attempted,
    // Then 400 is returned.
    it('returns 400 if user is already a member', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'users') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: true }),
                }),
            };
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({}),
            };
        });

        db.runTransaction = jest.fn().mockImplementation(async (fn) => {
            await fn({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data:   () => ({ members: ['user-2'], maxMembers: 10 }),
                }),
                update: jest.fn(),
            });
        });

        const res = await request(app)
            .post('/api/groups/group-1/join')
            .send({ userId: 'user-2' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/already a member/i);
    });

    // Given the group is full,
    // When join is attempted,
    // Then 400 is returned.
    it('returns 400 if group is full', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'users') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: true }),
                }),
            };
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({}),
            };
        });

        db.runTransaction = jest.fn().mockImplementation(async (fn) => {
            await fn({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data:   () => ({ members: ['u1', 'u2'], maxMembers: 2 }),
                }),
                update: jest.fn(),
            });
        });

        const res = await request(app)
            .post('/api/groups/group-1/join')
            .send({ userId: 'user-3' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/full/i);
    });
});

describe('POST /api/groups/:groupId/meetings — scheduleMeeting', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given valid meeting details,
    // When a meeting is scheduled,
    // Then 201 is returned.
    
    // Given missing meeting fields,
    // When a meeting is scheduled,
    // Then 400 is returned.
    

    // Given a group that doesn't exist,
    // When a meeting is scheduled,
    // Then 404 is returned.
    it('returns 404 if group does not exist', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: false }),
                }),
            };
        });

        const res = await request(app)
            .post('/api/groups/nonexistent/meetings')
            .send({
                title:    'Meeting',
                date:     '2026-06-01',
                location: 'Hall',
                agenda:   'Discussion',
            });

        expect(res.statusCode).toBe(404);
    });
});

describe('POST /api/groups/:groupId/announcements — sendAnnouncement', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given valid announcement data,
    // When an announcement is sent,
    // Then 201 is returned.
    it('sends an announcement successfully', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: true, data: () => mockGroupData }),
                }),
            };
            if (col === 'announcements') return {
                add: jest.fn().mockResolvedValue({ id: 'announcement-1' }),
            };
        });

        const res = await request(app)
            .post('/api/groups/group-1/announcements')
            .send({ title: 'Important Update', message: 'Pay by Friday' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Announcement sent successfully');
    });

    // Given missing title or message,
    // When an announcement is sent,
    // Then 400 is returned.
    it('returns 400 if title or message is missing', async () => {
        const res = await request(app)
            .post('/api/groups/group-1/announcements')
            .send({ title: 'Update' }); // missing message

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Title and message are required');
    });
});

describe('GET /api/groups/:groupId/announcements — getGroupAnnouncements', () => {

    beforeEach(() => jest.clearAllMocks());

    // Given a group with announcements,
    // When announcements are fetched,
    // Then all announcements are returned with 200.
    it('returns announcements successfully', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ groupName: 'Soweto Savers' }),
                    }),
                }),
            };
            if (col === 'announcements') return {
                where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                docs: [{ id: 'ann-1', data: () => mockAnnouncementData }],
                            }),
                        }),
                    }),
                }),
            };
        });

        const res = await request(app).get('/api/groups/group-1/announcements');

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('Important Update');
    });

    // Given a group that doesn't exist,
    // When announcements are fetched,
    // Then 404 is returned.
    it('returns 404 if group does not exist', async () => {
        db.collection.mockImplementation((col) => {
            if (col === 'groups') return {
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ exists: false }),
                }),
            };
        });

        const res = await request(app).get('/api/groups/nonexistent/announcements');
        expect(res.statusCode).toBe(404);
    });
});