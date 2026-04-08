const Member = require('../models/Member');
const Post = require('../models/Post');
const { successResponse, errorResponse, notFoundResponse, paginatedResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo, AuditActions } = require('../utils/auditLogger');

/**
 * Get own profile
 * GET /api/profile/me
 */
const getOwnProfile = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.member.memberId);

  if (!member) {
    return notFoundResponse(res, 'Profile');
  }

  return successResponse(res, {
    member: {
      uuid: member.uuid,
      email: member.email,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      classGrade: member.classGrade,
      phone: member.phone,
      joinReason: member.joinReason,
      bio: member.bio,
      role: member.role,
      status: member.status,
      schoolId: member.schoolId,
      schoolUuid: member.schoolUuid,
      schoolName: member.schoolName,
      classId: member.classId,
      classUuid: member.classUuid,
      className: member.className,
      createdAt: member.createdAt
    }
  });
});

/**
 * Update own profile
 * PUT /api/profile/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, avatarUrl, classGrade, phone, email, bio, schoolId, classId } = req.body;

  // If changing email, check it's not taken
  if (email && email !== req.member.email) {
    const existing = await Member.findByEmail(email);
    if (existing && existing.memberId !== req.member.memberId) {
      return errorResponse(res, 'Email already in use', 409);
    }
  }

  const updated = await Member.update(req.member.memberId, {
    fullName,
    avatarUrl,
    classGrade,
    phone,
    email,
    bio,
    schoolId,
    classId
  });

  if (!updated) {
    return errorResponse(res, 'Failed to update profile', 400);
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.PROFILE_UPDATED,
    entityType: 'member',
    entityId: req.member.memberId,
    ...clientInfo
  });

  return successResponse(res, {
    member: {
      uuid: updated.uuid,
      email: updated.email,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      classGrade: updated.classGrade,
      phone: updated.phone,
      bio: updated.bio,
      role: updated.role,
      status: updated.status,
      schoolId: updated.schoolId,
      classId: updated.classId
    }
  }, 'Profile updated successfully');
});

/**
 * Get public profile by UUID
 * GET /api/profile/:uuid
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const profile = await Member.getPublicProfile(req.params.uuid);

  if (!profile) {
    return notFoundResponse(res, 'Profile');
  }

  return successResponse(res, {
    profile: {
      uuid: profile.uuid,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      classGrade: profile.classGrade,
      bio: profile.bio,
      role: profile.role,
      createdAt: profile.createdAt,
      postCount: parseInt(profile.postCount) || 0,
      taggedCount: parseInt(profile.taggedCount) || 0,
      schoolId: profile.schoolId,
      schoolUuid: profile.schoolUuid,
      schoolName: profile.schoolName,
      schoolLogo: profile.schoolLogo,
      classId: profile.classId,
      classUuid: profile.classUuid,
      className: profile.className
    }
  });
});

/**
 * Get posts by member
 * GET /api/profile/:uuid/posts
 * PUBLIC - optionalAuth allows unauthenticated access
 */
const getMemberPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const member = await Member.findByUuid(req.params.uuid);

  if (!member || member.status !== 'active') {
    return notFoundResponse(res, 'Member');
  }

  // If viewing own profile, include unpublished posts
  // req.member is undefined for unauthenticated users
  const isOwnProfile = req.member && member.memberId === req.member.memberId;
  const isDirector = req.member && req.member.role === 'director';
  const includeUnpublished = isOwnProfile || isDirector;

  const { posts, total } = await Post.getByAuthor(member.memberId, {
    page,
    limit,
    includeUnpublished
  });

  // Add liked status for current member (false for unauthenticated users)
  const postsWithLikes = await Promise.all(posts.map(async (post) => ({
    ...post,
    isLiked: req.member && post.status === 'published'
      ? await Post.isLikedByMember(post.postId, req.member.memberId)
      : false
  })));

  return paginatedResponse(res, postsWithLikes, { page, limit, total });
});

/**
 * Get posts where member is tagged
 * GET /api/profile/:uuid/tagged
 * PUBLIC - optionalAuth allows unauthenticated access
 */
const getTaggedPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const member = await Member.findByUuid(req.params.uuid);

  if (!member || member.status !== 'active') {
    return notFoundResponse(res, 'Member');
  }

  const { posts, total } = await Post.getTaggedPosts(member.memberId, { page, limit });

  // Add liked status (false for unauthenticated users)
  const postsWithLikes = await Promise.all(posts.map(async (post) => ({
    ...post,
    isLiked: req.member
      ? await Post.isLikedByMember(post.postId, req.member.memberId)
      : false
  })));

  return paginatedResponse(res, postsWithLikes, { page, limit, total });
});

module.exports = {
  getOwnProfile,
  updateProfile,
  getPublicProfile,
  getMemberPosts,
  getTaggedPosts
};
