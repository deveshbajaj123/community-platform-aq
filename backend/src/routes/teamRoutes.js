const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authMiddleware, optionalAuth, requireDirector, requireActiveMember } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/', optionalAuth, teamController.getTeams);
router.get('/:uuid', optionalAuth, teamController.getTeam);
router.get('/:uuid/members', optionalAuth, teamController.getTeamMembers);

// Authenticated routes
router.get('/my/list', authMiddleware, teamController.getMyTeams);

// Director-only routes
router.post('/', authMiddleware, requireDirector, teamController.createTeam);
router.put('/:uuid', authMiddleware, requireDirector, teamController.updateTeam);
router.delete('/:uuid', authMiddleware, requireDirector, teamController.deleteTeam);

// Team member management (permission checks in controller)
// Add: Super Admin, Global Director, Team Creator, Team Lead
// Update Role: Super Admin, Team Creator
// Remove: Super Admin, Global Director, Team Creator, Team Lead (or self)
router.post('/:uuid/members', authMiddleware, teamController.addTeamMember);
router.put('/:uuid/members/:memberId', authMiddleware, teamController.updateTeamMemberRole);
router.delete('/:uuid/members/:memberId', authMiddleware, teamController.removeTeamMember);

// Team posts (requires active membership - checked in controller)
router.post('/:uuid/posts', authMiddleware, requireActiveMember, teamController.createTeamPost);

// Team post approval (for team directors - checks permissions internally)
router.get('/:uuid/pending-posts', authMiddleware, teamController.getTeamPendingPosts);
router.post('/:uuid/pending-posts/:postId/approve', authMiddleware, teamController.approveTeamPost);
router.post('/:uuid/pending-posts/:postId/reject', authMiddleware, teamController.rejectTeamPost);

module.exports = router;
