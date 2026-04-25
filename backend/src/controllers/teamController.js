const Team = require('../models/Team');
const Post = require('../models/Post');
const DirectorCategory = require('../models/DirectorCategory');
const TeamJoinRequest = require('../models/TeamJoinRequest');
const { pool } = require('../config/database');
const { successResponse, errorResponse, notFoundResponse, paginatedResponse, forbiddenResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo } = require('../utils/auditLogger');

/**
 * Get all teams (public)
 * GET /api/teams
 */
const getTeams = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category || null;
  const search = req.query.search || null;

  // Validate category if provided
  if (category && !Team.getValidCategories().includes(category)) {
    return errorResponse(res, 'Invalid category', 400);
  }

  const { teams, total } = await Team.getAll({ page, limit, category, search });

  return paginatedResponse(res, teams, { page, limit, total });
});

/**
 * Get team by UUID (public)
 * GET /api/teams/:uuid
 */
const getTeam = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Get team members
  const members = await Team.getMembers(team.teamId);

  return successResponse(res, {
    team: {
      ...team,
      members
    }
  });
});

/**
 * Create a team (director with category assignment or super admin)
 * POST /api/teams
 */
const createTeam = asyncHandler(async (req, res) => {
  const { name, description, category, logoUrl, memberIds } = req.body;

  if (!name || !category) {
    return errorResponse(res, 'Name and category are required', 400);
  }

  if (!Team.getValidCategories().includes(category)) {
    return errorResponse(res, 'Invalid category. Must be one of: ' + Team.getValidCategories().join(', '), 400);
  }

  // Directors (non-super-admin) can only create teams in categories they are assigned to
  if (req.member.role === 'director' && !req.member.isSuperAdmin) {
    const hasCategory = await DirectorCategory.isAssigned(req.member.memberId, category);
    if (!hasCategory) {
      return forbiddenResponse(res, `You can only create teams in categories you are assigned to. You are not assigned to the '${category}' category.`);
    }
  }

  const team = await Team.create({
    name,
    description,
    category,
    logoUrl,
    createdBy: req.member.memberId
  });

  // Add creator as lead of the team
  await Team.addMember(team.teamId, req.member.memberId, 'lead');

  // Add additional members if provided
  if (memberIds && Array.isArray(memberIds)) {
    for (const { memberId, role } of memberIds) {
      if (memberId !== req.member.memberId) {
        await Team.addMember(team.teamId, memberId, role || 'member');
      }
    }
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_CREATED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { name, category }
  });

  return successResponse(res, { team }, 'Team created successfully', 201);
});

/**
 * Update a team (team lead or above)
 * PUT /api/teams/:uuid
 */
const updateTeam = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { name, description, category, logoUrl, isActive } = req.body;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const updated = await Team.update(team.teamId, {
    name,
    description,
    category,
    logoUrl,
    isActive
  });

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_UPDATED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo
  });

  return successResponse(res, { team: updated }, 'Team updated successfully');
});

/**
 * Delete a team (director or super admin)
 * DELETE /api/teams/:uuid
 */
const deleteTeam = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  await Team.delete(team.teamId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_DELETED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo
  });

  return successResponse(res, null, 'Team deleted successfully');
});

/**
 * Get team members
 * GET /api/teams/:uuid/members
 */
const getTeamMembers = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const members = await Team.getMembers(team.teamId);

  return successResponse(res, { members });
});

/**
 * Add member to team
 * POST /api/teams/:uuid/members
 * Permissions: Super Admin, Global Director, Team Creator, Team Lead
 */
const addTeamMember = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { memberId, role } = req.body;

  if (!memberId) {
    return errorResponse(res, 'memberId is required', 400);
  }

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check if user can manage team members
  const managePerms = await Team.canManageTeam(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false
  );

  if (!managePerms.canManage) {
    return forbiddenResponse(res, 'You do not have permission to add members to this team');
  }

  // Validate role assignment if a role other than 'member' is specified
  const assignedRole = role || 'member';
  if (assignedRole !== 'member') {
    const roleValidation = await Team.validateRoleAssignment(
      team.teamId,
      req.member.memberId,
      req.member.role,
      req.member.isSuperAdmin || false,
      memberId,
      assignedRole
    );

    if (!roleValidation.valid) {
      return errorResponse(res, roleValidation.message, 403);
    }
  }

  const membership = await Team.addMember(team.teamId, memberId, assignedRole);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_MEMBER_ADDED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { addedMemberId: memberId, role: assignedRole }
  });

  return successResponse(res, { membership }, 'Member added to team');
});

/**
 * Remove member from team
 * DELETE /api/teams/:uuid/members/:memberId
 * Permissions: Super Admin, Global Director, Team Creator, Team Lead (or self-removal)
 */
const removeTeamMember = asyncHandler(async (req, res) => {
  const { uuid, memberId } = req.params;
  const targetMemberId = parseInt(memberId);

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Self-removal is always allowed
  const isSelf = targetMemberId === req.member.memberId;

  if (!isSelf) {
    // Check if user can manage team members
    const managePerms = await Team.canManageTeam(
      team.teamId,
      req.member.memberId,
      req.member.role,
      req.member.isSuperAdmin || false
    );

    if (!managePerms.canManage) {
      return forbiddenResponse(res, 'You do not have permission to remove members from this team');
    }
  }

  await Team.removeMember(team.teamId, targetMemberId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_MEMBER_REMOVED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { removedMemberId: targetMemberId, selfRemoval: isSelf }
  });

  return successResponse(res, null, 'Member removed from team');
});

/**
 * Update member role in team
 * PUT /api/teams/:uuid/members/:memberId
 * Permissions: Super Admin, Team Creator (lead role only)
 */
const updateTeamMemberRole = asyncHandler(async (req, res) => {
  const { uuid, memberId } = req.params;
  const { role } = req.body;
  const targetMemberId = parseInt(memberId);

  if (!role) {
    return errorResponse(res, 'Role is required', 400);
  }

  if (!Team.getValidRoles().includes(role)) {
    return errorResponse(res, 'Invalid role. Must be one of: ' + Team.getValidRoles().join(', '), 400);
  }

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Validate role assignment permissions
  const roleValidation = await Team.validateRoleAssignment(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false,
    targetMemberId,
    role
  );

  if (!roleValidation.valid) {
    return forbiddenResponse(res, roleValidation.message);
  }

  const updated = await Team.updateMemberRole(team.teamId, targetMemberId, role);
  if (!updated) {
    return notFoundResponse(res, 'Team membership');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_MEMBER_ROLE_UPDATED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { targetMemberId, newRole: role }
  });

  return successResponse(res, { membership: updated }, 'Member role updated');
});

/**
 * Get teams for current member
 * GET /api/teams/my
 */
const getMyTeams = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const { teams, total } = await Team.getByMember(req.member.memberId, { page, limit });

  return paginatedResponse(res, teams, { page, limit, total });
});

/**
 * Get pending posts for a specific team
 * GET /api/teams/:uuid/pending-posts
 * Only team leads can access this
 */
const getTeamPendingPosts = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const isSuperAdmin = req.member.isSuperAdmin || false;

  // Check if user can approve posts (handles category-based director permissions)
  const canApprove = await Team.canApprovePosts(
    team.teamId,
    req.member.memberId,
    req.member.role,
    isSuperAdmin
  );

  if (!canApprove) {
    return forbiddenResponse(res, 'You do not have permission to view pending posts for this team');
  }

  // Get pending posts for this team
  const { posts, total } = await Post.getPendingTeamPostsForDirector(team.teamId, { page, limit });

  return paginatedResponse(res, posts, { page, limit, total });
});

/**
 * Approve a pending team post
 * POST /api/teams/:uuid/pending-posts/:postId/approve
 * Only team leads can approve
 */
const approveTeamPost = asyncHandler(async (req, res) => {
  const { uuid, postId } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const isSuperAdmin = req.member.isSuperAdmin || false;

  // Check if user can approve posts (handles category-based director permissions)
  const canApprove = await Team.canApprovePosts(
    team.teamId,
    req.member.memberId,
    req.member.role,
    isSuperAdmin
  );

  if (!canApprove) {
    return forbiddenResponse(res, 'You do not have permission to approve posts for this team');
  }

  // Get the post and verify it belongs to this team
  const post = await Post.findById(postId);
  if (!post || post.status !== 'pending_review') {
    return notFoundResponse(res, 'Post or already processed');
  }

  if (post.teamId !== team.teamId) {
    return errorResponse(res, 'This post does not belong to this team', 400);
  }

  // Approve the post
  const approvedPost = await Post.approve(postId, req.member.memberId);
  if (!approvedPost) {
    return notFoundResponse(res, 'Post or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_POST_APPROVED',
    entityType: 'post',
    entityId: parseInt(postId),
    ...clientInfo,
    details: {
      teamId: team.teamId,
      teamName: team.name
    }
  });

  return successResponse(res, { post: approvedPost }, 'Post approved and published');
});

/**
 * Reject a pending team post
 * POST /api/teams/:uuid/pending-posts/:postId/reject
 * Only team directors can reject
 */
const rejectTeamPost = asyncHandler(async (req, res) => {
  const { uuid, postId } = req.params;
  const { rejectionNote } = req.body;

  if (!rejectionNote) {
    return errorResponse(res, 'Rejection note is required', 400);
  }

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const isSuperAdmin = req.member.isSuperAdmin || false;

  // Check if user can approve posts (handles category-based director permissions)
  const canApprove = await Team.canApprovePosts(
    team.teamId,
    req.member.memberId,
    req.member.role,
    isSuperAdmin
  );

  if (!canApprove) {
    return forbiddenResponse(res, 'You do not have permission to reject posts for this team');
  }

  // Get the post and verify it belongs to this team
  const post = await Post.findById(postId);
  if (!post || post.status !== 'pending_review') {
    return notFoundResponse(res, 'Post or already processed');
  }

  if (post.teamId !== team.teamId) {
    return errorResponse(res, 'This post does not belong to this team', 400);
  }

  // Reject the post
  const rejectedPost = await Post.reject(postId, req.member.memberId, rejectionNote);
  if (!rejectedPost) {
    return notFoundResponse(res, 'Post or already processed');
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_POST_REJECTED',
    entityType: 'post',
    entityId: parseInt(postId),
    ...clientInfo,
    details: {
      teamId: team.teamId,
      teamName: team.name,
      rejectionNote
    }
  });

  return successResponse(res, { post: rejectedPost }, 'Post rejected');
});

/**
 * Create a post linked to a team
 * POST /api/teams/:uuid/posts
 * Requires active team membership
 */
const createTeamPost = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { category, body, taggedMemberIds, imageUrls } = req.body;

  // Validate required fields
  if (!body || !body.trim()) {
    return errorResponse(res, 'Post body is required', 400);
  }
  if (body.trim().length < 10) {
    return errorResponse(res, 'Post must be at least 10 characters long', 400);
  }
  if (body.trim().length > 1000) {
    return errorResponse(res, 'Post must be no more than 1000 characters', 400);
  }

  // Find the team
  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check if user is a member of the team
  const teamMembership = await Team.isMember(team.teamId, req.member.memberId);
  const isGlobalDirector = req.member.role === 'director';
  const isSuperAdmin = req.member.isSuperAdmin || false;

  // Check if global director has category assignment for this team
  let directorHasCategory = false;
  if (isGlobalDirector && !isSuperAdmin) {
    directorHasCategory = await DirectorCategory.isAssigned(req.member.memberId, team.category);
  }

  // Allow access if: team member, director with category, or super admin
  if (!teamMembership && !directorHasCategory && !isSuperAdmin) {
    return forbiddenResponse(res, 'You must be a member of this team to create a post');
  }

  const isTeamLead = teamMembership?.role === 'lead';
  const isTeamCreator = team.createdBy === req.member.memberId;

  // Validate tagged members belong to the team
  if (taggedMemberIds && taggedMemberIds.length > 0) {
    const teamMembers = await Team.getMembers(team.teamId);
    const teamMemberIds = teamMembers.map(m => m.memberId);
    const invalidTags = taggedMemberIds.filter(id => !teamMemberIds.includes(id));
    if (invalidTags.length > 0) {
      return errorResponse(res, 'Some tagged members are not part of this team', 400);
    }
  }

  // Determine post status based on author's role
  // Auto-publish if author is: super admin, director with category, team creator, or team lead
  // Regular members' posts require approval
  const shouldAutoPublish = isSuperAdmin || directorHasCategory || isTeamCreator || isTeamLead;
  const status = shouldAutoPublish ? 'published' : 'pending_review';

  // Use the team's category if not provided
  const postCategory = category || team.category;

  // Validate category
  const validCategories = ['events', 'welfare', 'content', 'operations', 'labs'];
  if (!validCategories.includes(postCategory)) {
    return errorResponse(res, 'Invalid category. Must be one of: ' + validCategories.join(', '), 400);
  }

  // Create the team post
  const post = await Post.createTeamPost({
    authorId: req.member.memberId,
    teamId: team.teamId,
    category: postCategory,
    body: body.trim(),
    status,
    taggedMemberIds: taggedMemberIds || [],
    imageUrls: Array.isArray(imageUrls) ? imageUrls : []
  });

  // Audit log
  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_POST_CREATED',
    entityType: 'post',
    entityId: post.postId,
    ...clientInfo,
    details: {
      teamId: team.teamId,
      teamName: team.name,
      category: postCategory,
      status,
      taggedMemberCount: taggedMemberIds?.length || 0
    }
  });

  const message = status === 'published'
    ? 'Post published successfully'
    : 'Post submitted for team lead approval';

  return successResponse(res, {
    post: {
      ...post,
      teamName: team.name,
      teamUuid: team.uuid
    }
  }, message, 201);
});

/**
 * Bulk add members to a team
 * POST /api/teams/:uuid/members/bulk
 * Body: { members: [{ memberId, role }] }
 */
const addTeamMembersBulk = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { members } = req.body;

  if (!Array.isArray(members) || members.length === 0) {
    return errorResponse(res, 'members array is required and must not be empty', 400);
  }

  if (members.length > 50) {
    return errorResponse(res, 'Cannot add more than 50 members at once', 400);
  }

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check if user can manage team members
  const managePerms = await Team.canManageTeam(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false
  );

  if (!managePerms.canManage) {
    return forbiddenResponse(res, 'You do not have permission to add members to this team');
  }

  const added = [];
  const failed = [];

  for (const entry of members) {
    const { memberId, role } = entry;
    if (!memberId) {
      failed.push({ memberId, reason: 'memberId is required' });
      continue;
    }

    const assignedRole = role || 'member';

    try {
      const membership = await Team.addMember(team.teamId, memberId, assignedRole);
      added.push({ memberId, role: assignedRole, membership });
    } catch (err) {
      // Likely a duplicate key (already a member)
      failed.push({ memberId, reason: err.message || 'Failed to add member' });
    }
  }

  if (added.length > 0) {
    const clientInfo = getClientInfo(req);
    await logAuditEvent({
      memberId: req.member.memberId,
      action: 'TEAM_MEMBERS_BULK_ADDED',
      entityType: 'team',
      entityId: team.teamId,
      ...clientInfo,
      details: { addedCount: added.length, failedCount: failed.length }
    });
  }

  return successResponse(
    res,
    { added, failed },
    `Added ${added.length} member${added.length !== 1 ? 's' : ''}${failed.length > 0 ? `, ${failed.length} failed` : ''}`
  );
});

// ============================================================
// TEAM JOIN REQUESTS
// ============================================================

/**
 * Apply to join a team
 * POST /api/teams/:uuid/join-requests
 * Requires active membership in the platform
 */
const createJoinRequest = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { message } = req.body;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check if already a team member
  const existing = await Team.isMember(team.teamId, req.member.memberId);
  if (existing) {
    return errorResponse(res, 'You are already a member of this team', 400);
  }

  // Check if already has a pending request
  const pendingReq = await TeamJoinRequest.getByMemberAndTeam(req.member.memberId, team.teamId);
  if (pendingReq) {
    return errorResponse(res, 'You already have a pending application for this team', 400);
  }

  const request = await TeamJoinRequest.create({
    teamId: team.teamId,
    memberId: req.member.memberId,
    message: message || null
  });

  return successResponse(res, { request }, 'Application submitted successfully', 201);
});

/**
 * Get pending join requests for a team
 * GET /api/teams/:uuid/join-requests
 * Requires team management permission
 */
const getJoinRequests = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check if user can manage the team
  const managePerms = await Team.canManageTeam(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false
  );

  if (!managePerms.canManage) {
    return forbiddenResponse(res, 'You do not have permission to view join requests for this team');
  }

  const requests = await TeamJoinRequest.getPendingByTeam(team.teamId);

  return successResponse(res, { requests, total: requests.length });
});

/**
 * Get the current user's join request status for a team
 * GET /api/teams/:uuid/join-requests/my
 */
const getMyJoinRequest = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const request = await TeamJoinRequest.getByMemberAndTeam(req.member.memberId, team.teamId);

  return successResponse(res, { request: request || null });
});

/**
 * Approve a join request
 * POST /api/teams/:uuid/join-requests/:requestUuid/approve
 */
const approveJoinRequest = asyncHandler(async (req, res) => {
  const { uuid, requestUuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check management permission
  const managePerms = await Team.canManageTeam(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false
  );

  if (!managePerms.canManage) {
    return forbiddenResponse(res, 'You do not have permission to approve join requests');
  }

  const joinReq = await TeamJoinRequest.findByUuid(requestUuid);
  if (!joinReq || joinReq.teamId !== team.teamId) {
    return notFoundResponse(res, 'Join request');
  }

  if (joinReq.status !== 'pending') {
    return errorResponse(res, 'This request has already been processed', 400);
  }

  // Add member to team
  await Team.addMember(team.teamId, joinReq.memberId, 'member');

  // Update request status
  const updated = await TeamJoinRequest.approve(joinReq.requestId, req.member.memberId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_JOIN_REQUEST_APPROVED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { applicantMemberId: joinReq.memberId }
  });

  return successResponse(res, { request: updated }, 'Application approved — member added to team');
});

/**
 * Reject a join request
 * POST /api/teams/:uuid/join-requests/:requestUuid/reject
 */
const rejectJoinRequest = asyncHandler(async (req, res) => {
  const { uuid, requestUuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  // Check management permission
  const managePerms = await Team.canManageTeam(
    team.teamId,
    req.member.memberId,
    req.member.role,
    req.member.isSuperAdmin || false
  );

  if (!managePerms.canManage) {
    return forbiddenResponse(res, 'You do not have permission to reject join requests');
  }

  const joinReq = await TeamJoinRequest.findByUuid(requestUuid);
  if (!joinReq || joinReq.teamId !== team.teamId) {
    return notFoundResponse(res, 'Join request');
  }

  if (joinReq.status !== 'pending') {
    return errorResponse(res, 'This request has already been processed', 400);
  }

  const updated = await TeamJoinRequest.reject(joinReq.requestId, req.member.memberId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: 'TEAM_JOIN_REQUEST_REJECTED',
    entityType: 'team',
    entityId: team.teamId,
    ...clientInfo,
    details: { applicantMemberId: joinReq.memberId }
  });

  return successResponse(res, { request: updated }, 'Application rejected');
});

/**
 * Cancel own join request
 * DELETE /api/teams/:uuid/join-requests/:requestUuid
 */
const cancelJoinRequest = asyncHandler(async (req, res) => {
  const { uuid, requestUuid } = req.params;

  const team = await Team.findByUuid(uuid);
  if (!team) {
    return notFoundResponse(res, 'Team');
  }

  const joinReq = await TeamJoinRequest.findByUuid(requestUuid);
  if (!joinReq || joinReq.teamId !== team.teamId) {
    return notFoundResponse(res, 'Join request');
  }

  // Must be the applicant's own request
  if (joinReq.memberId !== req.member.memberId) {
    return forbiddenResponse(res, 'You can only cancel your own join request');
  }

  if (joinReq.status !== 'pending') {
    return errorResponse(res, 'This request has already been processed', 400);
  }

  await TeamJoinRequest.cancel(joinReq.requestId);

  return successResponse(res, null, 'Application cancelled');
});

module.exports = {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  addTeamMembersBulk,
  removeTeamMember,
  updateTeamMemberRole,
  getMyTeams,
  // Team posts
  createTeamPost,
  getTeamPendingPosts,
  approveTeamPost,
  rejectTeamPost,
  // Join requests
  createJoinRequest,
  getJoinRequests,
  getMyJoinRequest,
  approveJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
};
