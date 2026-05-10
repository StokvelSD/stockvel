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

    if (hash !== req.headers['x-paystack-signature']) {
        console.warn('Invalid Paystack Signature detected!');
        return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body);

    if (event.event !== 'charge.success') {
        return res.status(200).send('Event ignored');
    }

    const data = event.data;
    const metadata = data.metadata;

    try {
        let currentCycle = 1;

        if (metadata.groupId) {
            const groupDoc = await db.collection('groups').doc(metadata.groupId).get();
            if (groupDoc.exists) {
                currentCycle = groupDoc.data().currentCycle || 1;
            }
        }

        await db.collection('payments').add({
            userId: metadata.userId,
            groupId: metadata.groupId,
            groupName: metadata.groupName,
            userName: metadata.userName,
            amount: data.amount / 100,
            status: 'paid',
            cycleId: currentCycle,
            reference: data.reference,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Payment recorded for ${metadata.userName} — cycle ${currentCycle}`);
        return res.status(200).send('Webhook processed successfully');

    } catch (error) {
        console.error('Firebase Database Error:', error);
        return res.status(500).send('Internal Server Error');
    }
});

module.exports = router;