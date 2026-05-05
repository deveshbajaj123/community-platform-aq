const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

// Public routes (no auth required, but optionalAuth to track logged-in users)
router.get('/', optionalAuth, searchController.search);
router.get('/quick', optionalAuth, searchController.quickSearch);

module.exports = router;
