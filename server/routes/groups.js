const express = require('express');
const router = express.Router();
const { createGroup, getGroups, createJoinRequest} = require('../controllers/groupController');

router.post('/', createGroup);
router.get('/', getGroups);
router.post('/:groupId/join', createJoinRequest);

module.exports = router;