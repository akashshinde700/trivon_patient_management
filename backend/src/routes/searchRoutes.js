const express = require('express');
const router = express.Router();
const { advancedSearch } = require('../controllers/searchController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, advancedSearch);

module.exports = router;
