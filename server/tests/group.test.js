const request = require('supertest');
const app = require('../index');

jest.mock('../firebase/admin', () => {
  const mockTransaction = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        members: [],
        maxMembers: 10,
      }),
    }),
    update: jest.fn(),
  };

  const mockGroupRef = {}; // just a ref object, passed into transaction

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
                  createdAt: { toDate: () => new Date('2026-01-01') },
                }),
              },
            ],
          }),
          doc: jest.fn().mockReturnValue(mockGroupRef),
        };
      }

      if (collectionName === 'users') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: true }),
          }),
        };
      }

      return {};
    }),

    runTransaction: jest.fn().mockImplementation(async (callback) => {
      await callback(mockTransaction);
    }),
  };
});

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

describe('Get Groups', () => {
  it('should fetch groups successfully', async () => {
    const response = await request(app).get('/api/groups');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0].groupName).toBe('Test Stokvel');
  });
});

describe('Join Group', () => {
  it('should join a group successfully', async () => {
    const response = await request(app)
      .post('/api/groups/test-group-id/join')
      .send({ userId: 'user-123' });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('Successfully joined the group!');
  });

  it('should return 400 if userId is missing', async () => {
    const response = await request(app)
      .post('/api/groups/test-group-id/join')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 if user does not exist', async () => {
    const { collection } = require('../firebase/admin');
    collection.mockImplementationOnce((name) => {
      if (name === 'users') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false }),
          }),
        };
      }
    });

    const response = await request(app)
      .post('/api/groups/test-group-id/join')
      .send({ userId: 'ghost-user' });

    expect(response.statusCode).toBe(404);
  });
});