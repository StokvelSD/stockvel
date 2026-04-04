const jwt = require('jsonwebtoken');
const Group = require('../models/Group');

const db  = require('../firebase/admin');


const createGroup = async (req, res) => { 
    try{
        const {groupName, contributionAmount} = req.body;
        if(!groupName || !contributionAmount) {
            return res.status(400).json({ error: 'Group name and contribution amount are required' });
        }
        await db.collection('groups').add({
            groupName,
            contributionAmount,
            createdBy: req.userId,
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