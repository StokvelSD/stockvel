const jwt = require('jsonwebtoken');
const Group = require('../models/Group');

exports.createGroup = async (req, res) => { 
    try {
        const { name } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const userId = decoded.id;  
        const group = new Group({ name, createdBy: userId });
        await group.save();
        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};