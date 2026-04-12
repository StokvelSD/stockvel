const request = require('supertest');
const app = require('../index');

jest.mock('../firebase/admin', () => ({
  collection: jest.fn().mockReturnValue({
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
    })
  })
}));

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
    const response = await request(app)
      .get('/api/groups');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0].groupName).toBe('Test Stokvel');
  });
});