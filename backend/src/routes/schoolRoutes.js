const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Search schools (for dropdown/autocomplete) - must be before /:uuid
router.get('/search', schoolController.searchSchools);

// Get all schools
router.get('/', schoolController.getSchools);

// Get school by UUID with details
router.get('/:uuid', schoolController.getSchool);

// Get members from a school
router.get('/:uuid/members', schoolController.getSchoolMembers);

// ============================================
// PROTECTED ROUTES (auth required)
// ============================================

// Create a new school (director only)
router.post('/', authMiddleware, schoolController.createSchool);

// Update a school (director only)
router.put('/:uuid', authMiddleware, schoolController.updateSchool);

module.exports = router;
