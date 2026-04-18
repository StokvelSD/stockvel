const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../firebase/admin');

router.post('/paystack', express.json(), async (req, res) => {
    
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
        const event = req.body;

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
                    createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
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