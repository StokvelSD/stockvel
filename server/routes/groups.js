const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById, joinGroup } = require('../controllers/groupController');

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupById);
router.post('/:groupId/join', joinGroup);

module.exports = router;