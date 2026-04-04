const db  = require('../firebase/admin');


const createGroup = async (req, res) => { 
    try{
        const {groupName, contributionAmount} = req.body;
        if(!groupName || !groupName.trim() === '') {
            return res.status(400).json({ error: 'Group name isrequired' });
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

module.exports = {
    createGroup
};