const db  = require('../firebase/admin');


const createGroup = async (req, res) => { 
    try{
        const {
            groupName, 
            contributionAmount,
            description,
            maxMembers,
            meetingFrequency,
            duration,
            payoutOrder
        } = req.body;
        if(!groupName || !groupName.trim() === '') {
            return res.status(400).json({ error: 'Group name is required' });
        }
        if(!contributionAmount || contributionAmount <= 0) {
            return res.status(400).json({ error: 'Contribution amount is required' });
        }
        await db.collection('groups').add({
            groupName,
            contributionAmount,
            description,
            maxMembers,
            meetingFrequency,
            duration,
            payoutOrder,
            createdAt: new Date()
        });

        res.status(201).json({ message: 'Group created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create group' });
    }
};

const getGroups = async (req, res) => {
    try {
        const groupsSnapshot = await db.collection('groups').get();
        const groups = groupsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() ,
            createdAt: doc.data().createdAt.toDate()
        }));
        res.status(200).json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
};

const createJoinRequest = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body; // Assuming userId is sent in body, later from auth

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if group exists
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if join request already exists
        const existingRequest = await db.collection('joinRequests')
            .where('groupId', '==', groupId)
            .where('userId', '==', userId)
            .get();
        if (!existingRequest.empty) {
            return res.status(400).json({ error: 'Join request already sent' });
        }

        await db.collection('joinRequests').add({
            groupId,
            userId,
            status: 'pending',
            createdAt: new Date()
        });

        res.status(201).json({ message: 'Join request sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send join request' });
    }
};

module.exports = {
    createGroup,
    getGroups,
    createJoinRequest
};