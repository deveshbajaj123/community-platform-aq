const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authMiddleware, requireActiveMember } = require('../middleware/auth');

// Protected routes (auth + active status required)
// Place specific routes BEFORE parameterized routes to avoid conflicts
router.post('/', authMiddleware, requireActiveMember, achievementController.createAchievement);
router.get('/me', authMiddleware, requireActiveMember, achievementController.getMyAchievements);
router.put('/:uuid', authMiddleware, requireActiveMember, achievementController.updateAchievement);
router.delete('/:uuid', authMiddleware, requireActiveMember, achievementController.deleteAchievement);

// Public route (no auth required)
router.get('/member/:uuid', achievementController.getMemberAchievements);

module.exports = router;
