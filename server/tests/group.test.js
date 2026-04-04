const request = require('supertest');
const app = require('../index'); 

jest.mock('../firebase/admin', () => ({
    collection: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: 'test-group-id' })
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
            