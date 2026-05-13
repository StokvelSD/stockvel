const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth"); 
const {
    getPaidContributions,
    getUserContributions,
    getUserContributionsByGroup
} = require("../controllers/contributionsController");

router.get("/paid", authenticate, getPaidContributions);
router.get("/user/all", authenticate, getUserContributions);
router.get("/user/by-group", authenticate, getUserContributionsByGroup);

module.exports = router;