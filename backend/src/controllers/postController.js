const Post = require('../models/Post');
const Member = require('../models/Member');
const Team = require('../models/Team');
const { successResponse, errorResponse, createdResponse, paginatedResponse, forbiddenResponse, notFoundResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo, AuditActions } = require('../utils/auditLogger');

// Valid categories as per AquaTerra spec
const VALID_CATEGORIES = ['events', 'welfare', 'content', 'operations', 'labs'];

// Input validation constants
const MAX_POST_BODY_LENGTH = 5000;
const MIN_POST_BODY_LENGTH = 1;
const MAX_URL_LENGTH = 2048;
const MAX_PAGINATION_LIMIT = 100;

/**
 * Validate and sanitize URL - only allow http/https protocols
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitize pagination params
 */
const sanitizePagination = (page, limit) => {
  const sanitizedPage = Math.max(1, parseInt(page, 10) || 1);
  const sanitizedLimit = Math.min(MAX_PAGINATION_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
  return { page: sanitizedPage, limit: sanitizedLimit };
};

/**
 * Get feed posts (PUBLIC - no auth required)
 * GET /api/feed
 */
const getFeed = asyncHandler(async (req, res) => {
  const { page, limit } = sanitizePagination(req.query.page, req.query.limit);
  const category = req.query.category || null;

  // Validate category
  if (category && !VALID_CATEGORIES.includes(category)) {
    return errorResponse(res, 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', '), 400);
  }

  const { posts, total } = await Post.getFeed({ page, limit, category });

  // Add liked status for authenticated members, otherwise false
  const postsWithLikes = await Promise.all(posts.map(async (post) => ({
    ...post,
    isLiked: req.member ? await Post.isLikedByMember(post.postId, req.member.memberId) : false
  })));

  return paginatedResponse(res, postsWithLikes, { page, limit, total });
});

/**
 * Get single post (PUBLIC - no auth required for published posts)
 * GET /api/feed/:uuid
 */
const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findByUuid(req.params.uuid);

  if (!post) {
    return notFoundResponse(res, 'Post');
  }

  // Only show published posts to public
  // Unpublished posts only visible to author or directors
  if (post.status !== 'published') {
    if (!req.member) {
      return notFoundResponse(res, 'Post');
    }
    if (post.authorId !== req.member.memberId && req.member.role !== 'director') {
      return notFoundResponse(res, 'Post');
    }
  }

  const images = await Post.getImages(post.postId);
  const isLiked = req.member ? await Post.isLikedByMember(post.postId, req.member.memberId) : false;

  return successResponse(res, {
    post: {
      ...post,
      images,
      isLiked: isLiked
    }
  });
});

/**
 * Create post
 * POST /api/feed
 *
 * POST STATUS TRANSITION RULES:
 * =============================
 * 1. Member creates post → status = 'pending_review'
 *    - Post is NOT visible on public feed
 *    - Post appears in director's moderation queue
 *
 * 2. Director creates post → status = 'published'
 *    - Post is IMMEDIATELY visible on public feed
 *    - No approval needed
 *
 * 3. Director approves post → status = 'pending_review' → 'published'
 *    - Post becomes visible on public feed
 *    - Cannot be reversed (no unpublish)
 *
 * 4. Director rejects post → status = 'pending_review' → 'rejected'
 *    - Post is NOT visible on public feed
 *    - Author can see rejection note
 *    - Post cannot be edited or resubmitted (must create new post)
 *
 * MULTI-CATEGORY POSTS:
 * - If post has multiple categories, ALL assigned category directors must approve
 * - Post remains 'pending_review' until all approvals received
 * - Once all approvals received → status = 'published'
 */
const createPost = asyncHandler(async (req, res) => {
  const { category, body, linkUrl, linkTitle, linkImage, imageUrls, taggedMemberIds } = req.body;

  // Validate required fields
  if (!category || !body) {
    return errorResponse(res, 'Category and body are required', 400);
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    return errorResponse(res, 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', '), 400);
  }

  // Validate body length
  const trimmedBody = String(body).trim();
  if (trimmedBody.length < MIN_POST_BODY_LENGTH) {
    return errorResponse(res, 'Post body cannot be empty', 400);
  }
  if (trimmedBody.length > MAX_POST_BODY_LENGTH) {
    return errorResponse(res, `Post body must be ${MAX_POST_BODY_LENGTH} characters or less`, 400);
  }

  // Validate URLs if provided (must be http/https)
  if (linkUrl && !isValidUrl(linkUrl)) {
    return errorResponse(res, 'Invalid link URL. Must be a valid http or https URL', 400);
  }
  if (linkImage && !isValidUrl(linkImage)) {
    return errorResponse(res, 'Invalid link image URL. Must be a valid http or https URL', 400);
  }

  // Validate linkTitle length
  const sanitizedLinkTitle = linkTitle ? String(linkTitle).slice(0, 500) : null;

  // Validate imageUrls array
  let validatedImageUrls = [];
  if (imageUrls && Array.isArray(imageUrls)) {
    validatedImageUrls = imageUrls
      .slice(0, 4)
      .filter(url => typeof url === 'string' && isValidUrl(url));
  }

  // Validate taggedMemberIds array (must be integers)
  let validatedTaggedIds = [];
  if (taggedMemberIds && Array.isArray(taggedMemberIds)) {
    validatedTaggedIds = taggedMemberIds
      .slice(0, 20)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id) && id > 0);
  }

  // Status transition: Directors auto-publish, members require approval
  const status = req.member.role === 'director' ? 'published' : 'pending_review';

  const post = await Post.create({
    authorId: req.member.memberId,
    category,
    body: trimmedBody,
    linkUrl: linkUrl && isValidUrl(linkUrl) ? linkUrl.slice(0, MAX_URL_LENGTH) : null,
    linkTitle: sanitizedLinkTitle,
    linkImage: linkImage && isValidUrl(linkImage) ? linkImage.slice(0, MAX_URL_LENGTH) : null,
    status
  });

  // Add images if provided and valid
  if (validatedImageUrls.length > 0) {
    const images = validatedImageUrls.map((url, i) => ({
      url: url.slice(0, MAX_URL_LENGTH),
      name: `image-${i}`,
      size: 0
    }));
    await Post.addImages(post.postId, images);
  }

  // Add tags if provided and valid
  if (validatedTaggedIds.length > 0) {
    await Post.addTags(post.postId, validatedTaggedIds);
  }

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.POST_CREATED,
    entityType: 'post',
    entityId: post.postId,
    ...clientInfo,
    details: { category, status }
  });

  const message = status === 'published'
    ? 'Post published successfully'
    : 'Post submitted for review';

  return createdResponse(res, { post }, message);
});

/**
 * Toggle like on post
 * POST /api/feed/:uuid/like
 */
const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findByUuid(req.params.uuid);

  if (!post || post.status !== 'published') {
    return notFoundResponse(res, 'Post');
  }

  const result = await Post.toggleLike(post.postId, req.member.memberId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: result.liked ? AuditActions.POST_LIKED : AuditActions.POST_UNLIKED,
    entityType: 'post',
    entityId: post.postId,
    ...clientInfo
  });

  return successResponse(res, result);
});

/**
 * Get list of members who liked a post (PUBLIC)
 * GET /api/feed/:uuid/likers
 */
const getPostLikers = asyncHandler(async (req, res) => {
  const post = await Post.findByUuid(req.params.uuid);

  if (!post || post.status !== 'published') {
    return notFoundResponse(res, 'Post');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const { likers, total } = await Post.getLikers(post.postId, { page, limit });

  return paginatedResponse(res, likers, { page, limit, total });
});

/**
 * Delete own post
 * DELETE /api/feed/:uuid
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findByUuid(req.params.uuid);

  if (!post) {
    return notFoundResponse(res, 'Post');
  }

  // Only author or director can delete
  if (post.authorId !== req.member.memberId && req.member.role !== 'director') {
    return forbiddenResponse(res, 'You can only delete your own posts');
  }

  await Post.delete(post.postId);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.POST_DELETED,
    entityType: 'post',
    entityId: post.postId,
    ...clientInfo
  });

  return successResponse(res, null, 'Post deleted successfully');
});

/**
 * Search members for @mention
 * GET /api/feed/members/search
 */
const searchMembers = asyncHandler(async (req, res) => {
  const query = req.query.q || '';

  if (query.length < 2) {
    return successResponse(res, { members: [] });
  }

  const members = await Member.searchForMention(query, 10);

  return successResponse(res, { members });
});

module.exports = {
  getFeed,
  getPost,
  createPost,
  toggleLike,
  getPostLikers,
  deletePost,
  searchMembers
};
