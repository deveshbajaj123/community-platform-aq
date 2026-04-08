const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware, requireActiveMember, optionalAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/security');

// ============================================
// PUBLIC ROUTES (no auth required, but benefits from auth context)
// ============================================

// Get feed posts (PUBLIC - optionalAuth provides liked status if authenticated)
router.get('/', optionalAuth, postController.getFeed);

// Get single post (PUBLIC - optionalAuth provides context for unpublished posts if author/director)
router.get('/:uuid', optionalAuth, postController.getPost);

// ============================================
// PROTECTED ROUTES (requires authentication + active status)
// ============================================

// Search members for @mention (must be before /:uuid to avoid conflict)
// IMPORTANT: Place specific routes before param routes to avoid conflicts
router.get('/members/search', authMiddleware, requireActiveMember, postController.searchMembers);

// Create post (requires active member + rate limiting)
router.post('/', authMiddleware, requireActiveMember, postLimiter, postController.createPost);

// Like/unlike post (requires active member)
router.post('/:uuid/like', authMiddleware, requireActiveMember, postController.toggleLike);

// Delete own post (requires active member, ownership checked in controller)
router.delete('/:uuid', authMiddleware, requireActiveMember, postController.deletePost);

module.exports = router;
