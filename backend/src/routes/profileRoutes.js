const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ============================================
// PROTECTED ROUTES (auth required)
// These MUST come before /:uuid routes to avoid "me" being parsed as a uuid
// ============================================

// Get own profile
router.get('/me', authMiddleware, profileController.getOwnProfile);

// Update own profile
router.put('/me', authMiddleware, profileController.updateProfile);

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Get public profile by UUID (PUBLIC - anyone can view)
router.get('/:uuid', optionalAuth, profileController.getPublicProfile);

// Get posts by member (PUBLIC - anyone can view published posts)
router.get('/:uuid/posts', optionalAuth, profileController.getMemberPosts);

// Get posts where member is tagged (PUBLIC - anyone can view)
router.get('/:uuid/tagged', optionalAuth, profileController.getTaggedPosts);

module.exports = router;
