// server/tests/webhooks.test.js

const request = require('supertest');
const crypto  = require('crypto');
const express = require('express');

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAdd = jest.fn().mockResolvedValue({ id: 'payment-123' });

jest.mock('../firebase/admin', () => ({
    collection: jest.fn().mockReturnValue({ add: mockAdd }),
}));

jest.mock('firebase-admin', () => ({
    firestore: {
        FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-timestamp') },
    },
}));

// ─── App setup ───────────────────────────────────────────────────────────────

const webhookRouter = require('../routes/webhook');
const app = express();
app.use('/webhook', webhookRouter);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = 'test_paystack_secret';

// Sign the JSON string exactly as it will arrive over the wire
const makePayload = (event) => {
    const bodyStr   = JSON.stringify(event);
    const signature = crypto
        .createHmac('sha512', SECRET)
        .update(bodyStr)          // sign the string, not a Buffer
        .digest('hex');
    return { bodyStr, signature };
};

const chargeSuccessEvent = {
    event: 'charge.success',
    data: {
        amount:    50000,
        reference: 'PAY_REF_001',
        metadata: {
            userId:    'user-abc',
            groupId:   'group-xyz',
            groupName: 'Soweto Savers',
            userName:  'Alice Dlamini',
        },
    },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /webhook/paystack', () => {

    beforeEach(() => {
        process.env.PAYSTACK_SECRET_KEY = SECRET;
        mockAdd.mockClear();
        mockAdd.mockResolvedValue({ id: 'payment-123' });
    });

    // Given a valid signature and a charge.success event,
    // When the webhook is received,
    // Then the payment is saved and 200 is returned.
    it('returns 200 and saves payment on valid charge.success', async () => {
        const { bodyStr, signature } = makePayload(chargeSuccessEvent);

        const res = await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(bodyStr);

        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Webhook processed successfully');
    });

    // Given a valid charge.success event,
    // When the payment is saved,
    // Then Firestore receives the correct payment data.
    it('saves correct payment data to Firestore', async () => {
        const { bodyStr, signature } = makePayload(chargeSuccessEvent);

        await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(bodyStr);

        expect(mockAdd).toHaveBeenCalledTimes(1);
        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                userId:    'user-abc',
                groupId:   'group-xyz',
                groupName: 'Soweto Savers',
                userName:  'Alice Dlamini',
                amount:    500,          // 50000 / 100
                status:    'paid',
                reference: 'PAY_REF_001',
            })
        );
    });

    // Given a valid signature but a non-charge.success event,
    // When the webhook is received,
    // Then the event is ignored and 200 is returned.
    it('returns 200 and ignores non-charge.success events', async () => {
        const event = { event: 'transfer.success', data: {} };
        const { bodyStr, signature } = makePayload(event);

        const res = await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(bodyStr);

        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Event ignored');
        expect(mockAdd).not.toHaveBeenCalled();
    });

    // Given an invalid HMAC signature,
    // When the webhook is received,
    // Then 400 is returned and nothing is saved.
    it('returns 400 on invalid signature', async () => {
        const { bodyStr } = makePayload(chargeSuccessEvent);

        const res = await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', 'invalid-signature-xyz')
            .send(bodyStr);

        expect(res.statusCode).toBe(400);
        expect(res.text).toBe('Invalid signature');
        expect(mockAdd).not.toHaveBeenCalled();
    });

    // Given a missing signature header,
    // When the webhook is received,
    // Then 400 is returned.
    it('returns 400 when signature header is missing', async () => {
        const { bodyStr } = makePayload(chargeSuccessEvent);

        const res = await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .send(bodyStr);

        expect(res.statusCode).toBe(400);
        expect(mockAdd).not.toHaveBeenCalled();
    });

    // Given a valid event but Firestore throws,
    // When the payment save fails,
    // Then 500 is returned.
    it('returns 500 when Firestore add fails', async () => {
        mockAdd.mockRejectedValueOnce(new Error('Firestore unavailable'));
        const { bodyStr, signature } = makePayload(chargeSuccessEvent);

        const res = await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(bodyStr);

        expect(res.statusCode).toBe(500);
        expect(res.text).toBe('Internal Server Error');
    });

    // Given a valid charge.success event,
    // When the amount is in kobo,
    // Then it is divided by 100 before saving.
    it('converts amount from kobo to rands', async () => {
        const event = {
            ...chargeSuccessEvent,
            data: { ...chargeSuccessEvent.data, amount: 120000 },
        };
        const { bodyStr, signature } = makePayload(event);

        await request(app)
            .post('/webhook/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(bodyStr);

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 1200 })
        );
    });
});