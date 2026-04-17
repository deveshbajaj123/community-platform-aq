const Member = require('../models/Member');
const Post = require('../models/Post');
const DirectorCategory = require('../models/DirectorCategory');
const { pool } = require('../config/database');
const { successResponse, errorResponse, notFoundResponse, paginatedResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo, AuditActions } = require('../utils/auditLogger');

/**
 * Helper: check if a director can manage member approvals.
 * Only super admins and Operations-category directors have this authority.
 */
async function canManageApprovals(member) {
  if (member.isSuperAdmin) return true;
  return await DirectorCategory.isAssigned(member.memberId, 'operations');
}

/**
 * Get dashboard stats
 * GET /api/director/dashboard
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const hasApprovalAuth = await canManageApprovals(req.member);

  const queries = [
    pool.query(`SELECT COUNT(*) FROM posts WHERE status = 'pending_review'`),
    pool.query(`SELECT COUNT(*) FROM members WHERE status = 'active' AND is_active = TRUE`),
    pool.query(`SELECT COUNT(*) FROM posts WHERE status = 'published'`)
  ];

  if (hasApprovalAuth) {
    queries.unshift(pool.query(`SELECT COUNT(*) FROM members WHERE status = 'pending_approval' AND role = 'member'`));
  }

  const results = await Promise.all(queries);

  if (hasApprovalAuth) {
    const [pendingMembers, pendingPosts, totalMembers, totalPosts] = results;
    return successResponse(res, {
      pendingMemberApprovals: parseInt(pendingMembers.rows[0].count),
      pendingPostReviews: parseInt(pendingPosts.rows[0].count),
      totalActiveMembers: parseInt(totalMembers.rows[0].count),
      totalPublishedPosts: parseInt(totalPosts.rows[0].count)
    });
  } else {
    const [pendingPosts, totalMembers, totalPosts] = results;
    return successResponse(res, {
      pendingMemberApprovals: 0,
      pendingPostReviews: parseInt(pendingPosts.rows[0].count),
      totalActiveMembers: parseInt(totalMembers.rows[0].count),
      totalPublishedPosts: parseInt(totalPosts.rows[0].count)
    });
  }
});

/**
 * Get pending member approvals
 * GET /api/director/approvals
 * Restricted to Operations directors and super admins
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
  if (!await canManageApprovals(req.member)) {
    return errorResponse(res, 'Only Operations directors can review member applications', 403);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const { members, total } = await Member.getPendingApprovals({ page, limit });

  return paginatedResponse(res, members, { page, limit, total });
});

/**
 * Approve a member
 * POST /api/director/approvals/:memberId/approve
 * Restricted to Operations directors and super admins
 */
const approveMember = asyncHandler(async (req, res) => {
  if (!await canManageApprovals(req.member)) {
    return errorResponse(res, 'Only Operations directors can approve member applications', 403);
  }

  const { memberId } = req.params;

  const member = await Member.approve(memberId, req.member.memberId);

  if (!member) {
    return notFoundResponse(res, 'Member or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.MEMBER_APPROVED,
    entityType: 'member',
    entityId: parseInt(memberId),
    ...clientInfo,
    details: { approvedMemberEmail: member.email }
  });

  // TODO: Send notification email to member

  return successResponse(res, { member }, 'Member approved successfully');
});

/**
 * Reject a member
 * POST /api/director/approvals/:memberId/reject
 * Restricted to Operations directors and super admins
 */
const rejectMember = asyncHandler(async (req, res) => {
  if (!await canManageApprovals(req.member)) {
    return errorResponse(res, 'Only Operations directors can reject member applications', 403);
  }

  const { memberId } = req.params;
  const { rejectionNote } = req.body || {};

  if (!rejectionNote) {
    return errorResponse(res, 'Rejection note is required', 400);
  }

  const member = await Member.reject(memberId, rejectionNote, req.member.memberId);

  if (!member) {
    return notFoundResponse(res, 'Member or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.MEMBER_REJECTED,
    entityType: 'member',
    entityId: parseInt(memberId),
    ...clientInfo,
    details: { rejectedMemberEmail: member.email, reason: rejectionNote }
  });

  // TODO: Send notification email to member

  return successResponse(res, { member }, 'Member rejected');
});

/**
 * Get pending posts for moderation
 * GET /api/director/posts
 * Returns posts that the current director can approve based on their category assignments
 */
const getPendingPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Get director's assigned categories
  const directorCategories = await DirectorCategory.getByMember(req.member.memberId);

  // Super admins can see all pending posts
  if (req.member.isSuperAdmin) {
    const { posts, total } = await Post.getPendingReviews({ page, limit });
    return paginatedResponse(res, posts, { page, limit, total });
  }

  // Non-super directors with no categories have no power
  if (directorCategories.length === 0) {
    return paginatedResponse(res, [], { page, limit, total: 0 });
  }

  // Get posts that this director can approve
  const { posts, total } = await Post.getPendingForDirector(req.member.memberId, { page, limit });
  return paginatedResponse(res, posts, { page, limit, total });
});

/**
 * Approve a post (or a specific category for multi-category posts)
 * POST /api/director/posts/:postId/approve
 * Body: { category?: string } - optional, for category-specific approval
 */
const approvePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { category } = req.body || {};

  console.log(`[approvePost] Starting approval for post ${postId}, category: ${category || 'none'}`);

  // Get the post first
  let post;
  try {
    post = await Post.findById(postId);
  } catch (err) {
    console.error(`[approvePost] Error finding post ${postId}:`, err);
    throw err;
  }

  if (!post || post.status !== 'pending_review') {
    console.log(`[approvePost] Post ${postId} not found or not pending. Status: ${post?.status}`);
    return notFoundResponse(res, 'Post or already processed');
  }

  console.log(`[approvePost] Found post ${postId}, category: ${post.category}, status: ${post.status}`);

  // Get post categories (multi-category support)
  let postCategories;
  try {
    postCategories = await Post.getCategories(postId);
  } catch (err) {
    console.error(`[approvePost] Error getting categories for post ${postId}:`, err);
    throw err;
  }
  const isMultiCategory = postCategories.length > 0;
  console.log(`[approvePost] Post ${postId} isMultiCategory: ${isMultiCategory}, categories: ${postCategories.join(', ') || 'none'}`);

  if (isMultiCategory && category) {
    // Category-specific approval for multi-category post
    // Verify director is assigned to this category
    if (!req.member.isSuperAdmin) {
      const isAssigned = await DirectorCategory.isAssigned(req.member.memberId, category);
      if (!isAssigned) {
        return errorResponse(res, 'You are not assigned to approve this category', 403);
      }
    }

    // Add approval for this category
    const approval = await Post.addApproval(postId, category, req.member.memberId);
    if (!approval) {
      return errorResponse(res, 'Category already approved', 400);
    }

    const clientInfo = getClientInfo(req);
    await logAuditEvent({
      memberId: req.member.memberId,
      action: 'POST_CATEGORY_APPROVED',
      entityType: 'post',
      entityId: parseInt(postId),
      ...clientInfo,
      details: { category }
    });

    // Check if all categories are now approved
    const fullyApproved = await Post.isFullyApproved(postId);
    if (fullyApproved) {
      await Post.publish(postId);
      return successResponse(res, {
        post: { ...post, status: 'published' },
        categoryApproved: category,
        fullyApproved: true
      }, 'All categories approved - post published');
    }

    // Get remaining pending approvals
    const approvals = await Post.getApprovals(postId);
    const approvedCategories = approvals.map(a => a.category);
    const pendingCategories = postCategories.filter(c => !approvedCategories.includes(c));

    return successResponse(res, {
      categoryApproved: category,
      fullyApproved: false,
      approvedCategories,
      pendingCategories
    }, `Category '${category}' approved. Waiting for: ${pendingCategories.join(', ')}`);

  } else {
    // Simple approval (single category post or approve all)
    console.log(`[approvePost] Taking simple approval path for post ${postId}`);

    // Verify director is assigned (if they are not a super admin)
    if (!req.member.isSuperAdmin) {
      let directorCategories;
      try {
        directorCategories = await DirectorCategory.getByMember(req.member.memberId);
      } catch (err) {
        console.error(`[approvePost] Error getting director categories:`, err);
        throw err;
      }

      console.log(`[approvePost] Director has ${directorCategories.length} category assignments`);

      if (directorCategories.length === 0) {
        console.log(`[approvePost] Non-super director has no categories assigned, returning 403`);
        return errorResponse(res, 'You must be assigned to this category to approve it', 403);
      }

      const assignedCats = directorCategories.map(c => c.category);
      console.log(`[approvePost] Director assigned to: ${assignedCats.join(', ')}, post category: ${post.category}`);
      if (!assignedCats.includes(post.category)) {
        console.log(`[approvePost] Director not assigned to post category, returning 403`);
        return errorResponse(res, 'You are not assigned to approve this category', 403);
      }
    }

    let approvedPost;
    try {
      console.log(`[approvePost] Calling Post.approve(${postId}, ${req.member.memberId})`);
      approvedPost = await Post.approve(postId, req.member.memberId);
    } catch (err) {
      console.error(`[approvePost] Error approving post:`, err);
      throw err;
    }

    if (!approvedPost) {
      console.log(`[approvePost] Post.approve returned null`);
      return notFoundResponse(res, 'Post or already processed');
    }

    console.log(`[approvePost] Post approved successfully, logging audit event`);
    const clientInfo = getClientInfo(req);
    try {
      await logAuditEvent({
        memberId: req.member.memberId,
        action: AuditActions.POST_APPROVED,
        entityType: 'post',
        entityId: parseInt(postId),
        ...clientInfo
      });
    } catch (err) {
      console.error(`[approvePost] Error logging audit event (non-fatal):`, err);
      // Don't throw - audit logging shouldn't break the flow
    }

    console.log(`[approvePost] Returning success response`);
    return successResponse(res, { post: approvedPost }, 'Post approved and published');
  }
});

/**
 * Reject a post
 * POST /api/director/posts/:postId/reject
 */
const rejectPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { rejectionNote } = req.body || {};

  if (!rejectionNote) {
    return errorResponse(res, 'Rejection note is required', 400);
  }

  // Get the post to check its category
  const postToCheck = await Post.findById(postId);
  if (!postToCheck) {
    return notFoundResponse(res, 'Post or already processed');
  }

  // Verify director is assigned (if they are not a super admin)
  if (!req.member.isSuperAdmin) {
    const directorCategories = await DirectorCategory.getByMember(req.member.memberId);
    
    if (directorCategories.length === 0) {
      return errorResponse(res, 'You must be assigned to this category to reject it', 403);
    }
    
    const assignedCats = directorCategories.map(c => c.category);
    if (!assignedCats.includes(postToCheck.category)) {
      return errorResponse(res, 'You are not assigned to reject this category', 403);
    }
  }

  const post = await Post.reject(postId, req.member.memberId, rejectionNote);

  if (!post) {
    return notFoundResponse(res, 'Post or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.POST_REJECTED,
    entityType: 'post',
    entityId: parseInt(postId),
    ...clientInfo,
    details: { reason: rejectionNote }
  });

  // TODO: Send notification to post author

  return successResponse(res, { post }, 'Post rejected');
});

/**
 * Get member directory
 * GET /api/director/members
 */
const getMemberDirectory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const { members, total } = await Member.getActiveMembers({ page, limit, search });

  return paginatedResponse(res, members, { page, limit, total });
});

// ============================================
// CATEGORY MANAGEMENT
// ============================================

/**
 * Get all category assignments
 * GET /api/director/categories
 */
const getAllCategoryAssignments = asyncHandler(async (req, res) => {
  const assignments = await DirectorCategory.getAllAssignments();

  // Group by category
  const byCategory = {};
  DirectorCategory.getValidCategories().forEach(cat => {
    byCategory[cat] = [];
  });

  assignments.forEach(a => {
    byCategory[a.category].push({
      memberId: a.member_id,
      uuid: a.uuid,
      fullName: a.full_name,
      avatarUrl: a.avatar_url,
      email: a.email,
      assignedAt: a.assigned_at
    });
  });

  return successResponse(res, {
    categories: DirectorCategory.getValidCategories(),
    assignments: byCategory
  });
});

/**
 * Get current director's assigned categories
 * GET /api/director/my-categories
 */
const getMyCategories = asyncHandler(async (req, res) => {
  const categories = await DirectorCategory.getByMember(req.member.memberId);

  return successResponse(res, {
    categories: categories.map(c => ({
      category: c.category,
      assignedAt: c.assigned_at,
      assignedBy: c.assigned_by_name
    }))
  });
});

/**
 * Assign a category to a director
 * POST /api/director/categories/assign
 */
const assignCategory = asyncHandler(async (req, res) => {
  const { memberId, category } = req.body;

  if (!memberId || !category) {
    return errorResponse(res, 'memberId and category are required', 400);
  }

  // Verify target is a director
  const targetMember = await Member.findById(memberId);
  if (!targetMember || targetMember.role !== 'director') {
    return errorResponse(res, 'Target member must be a director', 400);
  }

  const assignment = await DirectorCategory.assign(memberId, category, req.member.memberId);

  if (!assignment) {
    return successResponse(res, null, 'Category already assigned to this director');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'CATEGORY_ASSIGNED',
    entityType: 'director_category',
    entityId: assignment.assignment_id,
    ...clientInfo,
    details: { targetMemberId: memberId, category }
  });

  return successResponse(res, { assignment }, 'Category assigned successfully');
});

/**
 * Remove a category assignment from a director
 * POST /api/director/categories/unassign
 */
const unassignCategory = asyncHandler(async (req, res) => {
  const { memberId, category } = req.body;

  if (!memberId || !category) {
    return errorResponse(res, 'memberId and category are required', 400);
  }

  const removed = await DirectorCategory.unassign(memberId, category);

  if (!removed) {
    return notFoundResponse(res, 'Category assignment');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'CATEGORY_UNASSIGNED',
    entityType: 'director_category',
    ...clientInfo,
    details: { targetMemberId: memberId, category }
  });

  return successResponse(res, null, 'Category unassigned successfully');
});

/**
 * Get all directors
 * GET /api/director/directors
 */
const getAllDirectors = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url, m.email, m.created_at, m.is_super_admin,
            COALESCE(
              (SELECT json_agg(dc.category ORDER BY dc.category)
               FROM director_categories dc
               WHERE dc.member_id = m.member_id),
              '[]'
            ) as categories
     FROM members m
     WHERE m.role = 'director' AND m.is_active = TRUE AND m.status = 'active'
     ORDER BY m.is_super_admin DESC, m.full_name`
  );

  const directors = result.rows.map(d => ({
    memberId: d.member_id,
    uuid: d.uuid,
    fullName: d.full_name,
    avatarUrl: d.avatar_url,
    email: d.email,
    createdAt: d.created_at,
    isSuperAdmin: d.is_super_admin || false,
    categories: d.categories || []
  }));

  return successResponse(res, { directors });
});

/**
 * Get pending project posts for team directors
 * GET /api/director/project-posts
 * Returns pending posts from projects where the current user is a team director
 */
const getPendingProjectPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const { posts, total } = await Post.getPendingProjectPostsForTeamDirector(
    req.member.memberId,
    { page, limit }
  );

  return paginatedResponse(res, posts, { page, limit, total });
});

/**
 * Approve a project post (team director approval)
 * POST /api/director/project-posts/:postId/approve
 * Only team directors of the project's team can approve
 */
const approveProjectPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post || post.status !== 'pending_review') {
    return notFoundResponse(res, 'Post or already processed');
  }

  // Check if this is a project post
  const linkedProject = await Post.getLinkedProject(postId);
  if (!linkedProject) {
    return errorResponse(res, 'This is not a project post. Use the regular approval endpoint.', 400);
  }

  // Check if the user is a team director for this project's team
  const Team = require('../models/Team');
  const isTeamDirector = await Team.isDirector(linkedProject.team_id, req.member.memberId);
  const isGlobalDirector = req.member.role === 'director';

  if (!isTeamDirector) {
    if (!isGlobalDirector) {
      return errorResponse(res, 'Only team directors can approve project posts', 403);
    }
    
    // Global director: ensure they have power
    if (!req.member.isSuperAdmin) {
      const directorCategories = await DirectorCategory.getByMember(req.member.memberId);
      
      if (directorCategories.length === 0) {
        return errorResponse(res, 'You must be assigned to this category to approve it', 403);
      }
      
      const assignedCats = directorCategories.map(c => c.category);
      if (post.category && !assignedCats.includes(post.category)) {
        return errorResponse(res, 'You are not assigned to approve this category', 403);
      }
    }
  }

  // Approve and publish the post
  const approvedPost = await Post.approve(postId, req.member.memberId);
  if (!approvedPost) {
    return notFoundResponse(res, 'Post or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'PROJECT_POST_APPROVED',
    entityType: 'post',
    entityId: parseInt(postId),
    ...clientInfo,
    details: {
      projectId: linkedProject.project_id,
      projectTitle: linkedProject.title
    }
  });

  return successResponse(res, { post: approvedPost }, 'Project post approved and published');
});

// ============================================
// SUPER-ADMIN: DIRECTOR MANAGEMENT
// ============================================

/**
 * Get members eligible for director promotion
 * GET /api/director/super-admin/eligible-members
 */
const getEligibleMembers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const { members, total } = await Member.getEligibleForPromotion({ page, limit, search });

  return paginatedResponse(res, members, { page, limit, total });
});

/**
 * Promote a member to director
 * POST /api/director/super-admin/promote/:memberId
 */
const promoteToDirector = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const member = await Member.findById(memberId);
  if (!member) {
    return notFoundResponse(res, 'Member');
  }

  if (member.role === 'director') {
    return errorResponse(res, 'Member is already a director', 400);
  }

  if (member.status !== 'active') {
    return errorResponse(res, 'Only active members can be promoted', 400);
  }

  const promoted = await Member.promoteToDirector(memberId);

  if (!promoted) {
    return errorResponse(res, 'Failed to promote member', 500);
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'DIRECTOR_PROMOTED',
    entityType: 'member',
    entityId: parseInt(memberId),
    ...clientInfo,
    details: { promotedMemberEmail: member.email }
  });

  return successResponse(res, { member: promoted }, 'Member promoted to director successfully');
});

/**
 * Demote a director back to member
 * POST /api/director/super-admin/demote/:memberId
 */
const demoteToMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const member = await Member.findById(memberId);
  if (!member) {
    return notFoundResponse(res, 'Member');
  }

  if (member.role !== 'director') {
    return errorResponse(res, 'Member is not a director', 400);
  }

  if (member.isSuperAdmin) {
    return errorResponse(res, 'Cannot demote a super admin', 403);
  }

  // Prevent self-demotion
  if (parseInt(memberId) === req.member.memberId) {
    return errorResponse(res, 'Cannot demote yourself', 400);
  }

  const demoted = await Member.demoteToMember(memberId);

  if (!demoted) {
    return errorResponse(res, 'Failed to demote director', 500);
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'DIRECTOR_DEMOTED',
    entityType: 'member',
    entityId: parseInt(memberId),
    ...clientInfo,
    details: { demotedMemberEmail: member.email }
  });

  return successResponse(res, { member: demoted }, 'Director demoted to member successfully');
});

/**
 * Delete a member account (super-admin only)
 * DELETE /api/director/super-admin/members/:memberId
 */
const deleteMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  // Prevent self-deletion
  if (parseInt(memberId) === req.member.memberId) {
    return errorResponse(res, 'Cannot delete your own account', 400);
  }

  // Look up target member directly (findById filters is_active, but we want to delete any member)
  const memberResult = await pool.query(
    'SELECT member_id, uuid, email, full_name, role, is_super_admin FROM members WHERE member_id = $1',
    [parseInt(memberId)]
  );
  const targetMember = memberResult.rows[0];

  if (!targetMember) {
    return notFoundResponse(res, 'Member');
  }

  // Prevent deleting super admins
  if (targetMember.is_super_admin) {
    return errorResponse(res, 'Cannot delete a super admin account', 403);
  }

  // Log audit event BEFORE deletion so member details are preserved
  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.MEMBER_DELETED,
    entityType: 'member',
    entityId: parseInt(memberId),
    ...clientInfo,
    details: {
      deletedMemberEmail: targetMember.email,
      deletedMemberName: targetMember.full_name,
      deletedMemberRole: targetMember.role,
      deletedMemberUuid: targetMember.uuid
    }
  });

  const deleted = await Member.deleteMember(parseInt(memberId));

  if (!deleted) {
    return errorResponse(res, 'Failed to delete member', 500);
  }

  return successResponse(res, {
    deletedMember: {
      memberId: deleted.memberId,
      email: deleted.email,
      fullName: deleted.fullName
    }
  }, 'Member account deleted successfully');
});

module.exports = {
  getDashboardStats,
  getPendingApprovals,
  approveMember,
  rejectMember,
  getPendingPosts,
  approvePost,
  rejectPost,
  getMemberDirectory,
  // Category management
  getAllCategoryAssignments,
  getMyCategories,
  assignCategory,
  unassignCategory,
  getAllDirectors,
  // Project post approval
  getPendingProjectPosts,
  approveProjectPost,
  // Super-admin director management
  getEligibleMembers,
  promoteToDirector,
  demoteToMember,
  deleteMember
};
