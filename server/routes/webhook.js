const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const admin = require('firebase-admin');
const db = require('../firebase/admin');

router.post('/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
    
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret)
                       .update(req.body)
                       .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
        const event = JSON.parse(req.body);

        if (event.event === 'charge.success') {
            const data = event.data;
            const metadata = data.metadata;

            try {
                await db.collection('payments').add({
                    userId: metadata.userId,
                    groupId: metadata.groupId,
                    groupName: metadata.groupName,
                    userName: metadata.userName,
                    amount: data.amount / 100,
                    status: 'paid',
                    reference: data.reference,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Payment successfully recorded for ${metadata.userName}`);
                return res.status(200).send('Webhook processed successfully');

            } catch (error) {
                console.error('Firebase Database Error:', error);
                return res.status(500).send('Internal Server Error');
            }
        }

        return res.status(200).send('Event ignored');

    } else {
        console.warn('Invalid Paystack Signature detected!');
        return res.status(400).send('Invalid signature');
    }
});

module.exports = router;