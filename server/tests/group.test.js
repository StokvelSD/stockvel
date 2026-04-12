const request = require('supertest');
const app = require('../index');

// Mock for a group doc that exists
const mockGroupDoc = {
  exists: true,
  data: () => ({
    groupName: 'Test Stokvel',
    contributionAmount: 500,
    createdAt: { toDate: () => new Date('2026-01-01') }
  })
};

// Reusable chainable where mock (supports .where().where().get())
const makeWhereMock = (empty = true) => {
  const whereMock = {
    where: jest.fn(),
    get: jest.fn().mockResolvedValue({ empty })
  };
  whereMock.where.mockReturnValue(whereMock); // chaining .where().where()
  return whereMock;
};

jest.mock('../firebase/admin', () => {
  const whereMock = makeWhereMock(true); // no existing join request by default

  return {
    collection: jest.fn().mockImplementation((collectionName) => {
      if (collectionName === 'groups') {
        return {
          add: jest.fn().mockResolvedValue({ id: 'test-group-id' }),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'test-group-id',
                data: () => ({
                  groupName: 'Test Stokvel',
                  contributionAmount: 500,
                  createdAt: { toDate: () => new Date('2026-01-01') }
                })
              }
            ]
          }),
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockGroupDoc)
          })
        };
      }

      if (collectionName === 'joinRequests') {
        return {
          add: jest.fn().mockResolvedValue({ id: 'test-join-id' }),
          where: jest.fn().mockReturnValue(whereMock)
        };
      }

      return {};
    })
  };
});

// --- Group Creation ---
describe('Group Creation', () => {
  it('should create a group successfully', async () => {
    const response = await request(app)
      .post('/api/groups')
      .send({ groupName: 'Test Stokvel', contributionAmount: 500 });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('Group created successfully');
  });

  it('should return an error if groupName is missing', async () => {
    const response = await request(app)
      .post('/api/groups')
      .send({ contributionAmount: 500 });

    expect(response.statusCode).toBe(400);
  });
});

// --- Get Groups ---
describe('Get Groups', () => {
  it('should fetch groups successfully', async () => {
    const response = await request(app).get('/api/groups');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0].groupName).toBe('Test Stokvel');
  });
});

// --- Join Requests ---
describe('Join Requests', () => {
  it('should send a join request successfully', async () => {
    const response = await request(app)
      .post('/api/groups/test-group-id/join')
      .send({ userId: 'user-123' });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('Join request sent successfully');
  });

  it('should return 400 if userId is missing', async () => {
    const response = await request(app)
      .post('/api/groups/test-group-id/join')
      .send({});

    expect(response.statusCode).toBe(400);
  });
});