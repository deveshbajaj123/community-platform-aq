const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

// Google OAuth callback
router.post('/google', authLimiter, authController.googleAuth);

// Complete registration (for new Google users)
router.post('/register', authLimiter, authController.completeRegistration);

// Refresh token (rate limited to prevent brute force attacks)
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Get current user
router.get('/me', authMiddleware, authController.getCurrentUser);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Check registration status (for OAuth callback) - rate limited to prevent enumeration
router.get('/status/:googleId', authLimiter, authController.checkStatus);

module.exports = router;
