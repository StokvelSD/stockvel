const request = require('supertest');
const app = require('../index'); 
const { data } = require('autoprefixer');

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
                        createdAt: {toDate: () => new Date('2026-01-01')}
                    })
               }
            ]
        })
    
    })
}));

//Given an Admin user
//When they create a group with valid data,
//Then the group is saved and a success message is returned

describe('Group Creation', () => {
    it('should create a group successfully', async () => {
        const response = await request(app) 
            .post('/api/groups')
            .send({ groupName: 'Test Stokvel', contributionAmount: 500 });
        
            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe('Group created successfully');
    });


//Given an Admin user
//When they submit a group creation request with missing group name, 
//Then the server returns a 400 error indicating that the group name is required
    it('should return an error if groupName is missing', async () => {
        const response = await request(app)
            .post('/api/groups')
            .send({ 
                 contributionAmount: 500
                 });

        expect(response.statusCode).toBe(400);
    });
});

// Given group data exists in the database,
// When a request is made to fetch groups,
// Then the server returns a list of groups with their details.

describe('Get Groups', () => {
    it('should fetch groups successfully', async () => {
        const response = await request(app)
            .get('/api/groups');
            
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0].groupName).toBe('Test Stokvel');

    });
});