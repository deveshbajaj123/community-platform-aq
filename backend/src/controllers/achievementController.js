const Achievement = require('../models/Achievement');
const Member = require('../models/Member');
const { successResponse, errorResponse, notFoundResponse, forbiddenResponse, paginatedResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo, AuditActions } = require('../utils/auditLogger');

const VALID_TYPES = ['leadership', 'academic', 'competition', 'personal_project', 'other'];

/**
 * Create achievement
 * POST /api/achievements
 */
const createAchievement = asyncHandler(async (req, res) => {
  const { title, description, achievementType, achievementDate, achievementEndDate, proofUrl } = req.body;

  // Validation
  if (!title || !achievementType || !achievementDate) {
    return errorResponse(res, 'Title, type, and date are required', 400);
  }

  if (!VALID_TYPES.includes(achievementType)) {
    return errorResponse(res, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
  }

  // Check start date not in future
  const startDate = new Date(achievementDate);
  if (startDate > new Date()) {
    return errorResponse(res, 'Start date cannot be in the future', 400);
  }

  // Check end date is after start date (if provided)
  if (achievementEndDate) {
    const endDate = new Date(achievementEndDate);
    if (endDate < startDate) {
      return errorResponse(res, 'End date must be after start date', 400);
    }
  }

  const achievement = await Achievement.create({
    memberId: req.member.memberId,
    title,
    description,
    achievementType,
    achievementDate,
    achievementEndDate: achievementEndDate || null,
    proofUrl
  });

  // Audit log
  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.ACHIEVEMENT_CREATED,
    entityType: 'achievement',
    entityId: achievement.achievementId,
    ...clientInfo,
    details: { title, achievementType }
  });

  return successResponse(res, { achievement }, 'Achievement created successfully', 201);
});

/**
 * Get own achievements
 * GET /api/achievements/me
 */
const getMyAchievements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const type = req.query.type;

  const { achievements, total } = await Achievement.getByMember(req.member.memberId, { page, limit, type });

  return paginatedResponse(res, achievements, { page, limit, total });
});

/**
 * Get member achievements (public)
 * GET /api/achievements/member/:uuid
 */
const getMemberAchievements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const type = req.query.type;

  const member = await Member.findByUuid(req.params.uuid);
  if (!member || member.status !== 'active') {
    return notFoundResponse(res, 'Member');
  }

  const { achievements, total } = await Achievement.getByMember(member.memberId, { page, limit, type });

  return paginatedResponse(res, achievements, { page, limit, total });
});

/**
 * Update achievement
 * PUT /api/achievements/:uuid
 */
const updateAchievement = asyncHandler(async (req, res) => {
  const { title, description, achievementType, achievementDate, achievementEndDate, proofUrl } = req.body;

  const achievement = await Achievement.findByUuid(req.params.uuid);
  if (!achievement) {
    return notFoundResponse(res, 'Achievement');
  }

  // Check ownership
  if (achievement.memberId !== req.member.memberId) {
    return forbiddenResponse(res, 'You can only edit your own achievements');
  }

  // Validate type if provided
  if (achievementType && !VALID_TYPES.includes(achievementType)) {
    return errorResponse(res, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
  }

  // Validate dates if provided
  if (achievementDate) {
    const startDate = new Date(achievementDate);
    if (startDate > new Date()) {
      return errorResponse(res, 'Start date cannot be in the future', 400);
    }
    if (achievementEndDate) {
      const endDate = new Date(achievementEndDate);
      if (endDate < startDate) {
        return errorResponse(res, 'End date must be after start date', 400);
      }
    }
  }

  const updated = await Achievement.update(achievement.achievementId, {
    title,
    description,
    achievementType,
    achievementDate,
    achievementEndDate: achievementEndDate !== undefined ? (achievementEndDate || null) : achievement.achievementEndDate,
    proofUrl
  });

  // Audit log
  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.ACHIEVEMENT_UPDATED,
    entityType: 'achievement',
    entityId: achievement.achievementId,
    ...clientInfo
  });

  return successResponse(res, { achievement: updated }, 'Achievement updated successfully');
});

/**
 * Delete achievement
 * DELETE /api/achievements/:uuid
 */
const deleteAchievement = asyncHandler(async (req, res) => {
  const achievement = await Achievement.findByUuid(req.params.uuid);
  if (!achievement) {
    return notFoundResponse(res, 'Achievement');
  }

  // Check ownership
  if (achievement.memberId !== req.member.memberId) {
    return forbiddenResponse(res, 'You can only delete your own achievements');
  }

  await Achievement.delete(achievement.achievementId);

  // Audit log
  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.ACHIEVEMENT_DELETED,
    entityType: 'achievement',
    entityId: achievement.achievementId,
    ...clientInfo
  });

  return successResponse(res, null, 'Achievement deleted successfully');
});

module.exports = {
  createAchievement,
  getMyAchievements,
  getMemberAchievements,
  updateAchievement,
  deleteAchievement
};
