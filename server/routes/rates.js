const express = require('express');
const router = express.Router();
const { getSarbRates } = require('../controllers/ratesController');

router.get('/', getSarbRates);
module.exports = router;