const express = require('express');
const router = express.Router();
const directorController = require('../controllers/directorController');
const { authMiddleware, requireDirector, requireSuperAdmin } = require('../middleware/auth');

// All routes require director role - returns 404 for non-directors
router.use(authMiddleware, requireDirector);

// Dashboard stats
router.get('/dashboard', directorController.getDashboardStats);

// Member approvals
router.get('/approvals', directorController.getPendingApprovals);
router.post('/approvals/:memberId/approve', directorController.approveMember);
router.post('/approvals/:memberId/reject', directorController.rejectMember);

// Post moderation
router.get('/posts', directorController.getPendingPosts);
router.post('/posts/:postId/approve', directorController.approvePost);
router.post('/posts/:postId/reject', directorController.rejectPost);

// Member directory
router.get('/members', directorController.getMemberDirectory);

// Category management (read-only for all directors)
router.get('/categories', directorController.getAllCategoryAssignments);
router.get('/my-categories', directorController.getMyCategories);
router.get('/directors', directorController.getAllDirectors);

// Project post approval (for global directors)
router.get('/project-posts', directorController.getPendingProjectPosts);
router.post('/project-posts/:postId/approve', directorController.approveProjectPost);

// ============================================
// SUPER-ADMIN ONLY ROUTES
// ============================================

// Category management (super-admin only)
router.post('/super-admin/categories/assign', requireSuperAdmin, directorController.assignCategory);
router.post('/super-admin/categories/unassign', requireSuperAdmin, directorController.unassignCategory);

// Director management (super-admin only)
router.get('/super-admin/eligible-members', requireSuperAdmin, directorController.getEligibleMembers);
router.post('/super-admin/promote/:memberId', requireSuperAdmin, directorController.promoteToDirector);
router.post('/super-admin/demote/:memberId', requireSuperAdmin, directorController.demoteToMember);

// Member deletion (super-admin only)
router.delete('/super-admin/members/:memberId', requireSuperAdmin, directorController.deleteMember);

module.exports = router;
