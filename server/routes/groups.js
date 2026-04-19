const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById, joinGroup, scheduleMeeting, getGroupAnnouncements, sendAnnouncement, addMeetingMinutes, getGroupMeetings, getMeetingById} = require('../controllers/groupController');

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupById);
router.post('/:groupId/join', joinGroup);
router.post('/:groupId/schedule-meeting', scheduleMeeting);
router.get('/:groupId/announcements', getGroupAnnouncements);
router.post('/:groupId/announcements', sendAnnouncement);
router.put('/:groupId/meetings/:meetingId/minutes', addMeetingMinutes);
router.get('/:groupId/meetings', getGroupMeetings);
router.get('/:groupId/meetings/:meetingId', getMeetingById);

module.exports = router;