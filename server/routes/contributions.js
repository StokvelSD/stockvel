const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth"); 
const {
    getUserContributions,
    getTotPaid,
    getContributionsByGroup
} = require("../controllers/contributionsController");


router.get("/user/all", authenticate, getUserContributions);
router.get("/user/total", authenticate, getTotPaid);
router.get("/user/by-group", authenticate, getContributionsByGroup);

module.exports = router;