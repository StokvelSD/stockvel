const db  = require('../firebase/admin');


const createGroup = async (req, res) => { 
    try{
        const {groupName, contributionAmount} = req.body;
        if(!groupName || !groupName.trim() === '') {
            return res.status(400).json({ error: 'Group name is required' });
        }
        if(!contributionAmount || contributionAmount <= 0) {
            return res.status(400).json({ error: 'Contribution amount is required' });
        }
        await db.collection('groups').add({
            groupName,
            contributionAmount,
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

module.exports = {
    createGroup,
    getGroups
};