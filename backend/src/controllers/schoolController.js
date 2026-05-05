const School = require('../models/School');
const { successResponse, notFoundResponse, paginatedResponse, createdResponse, forbiddenResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Get all schools
 * GET /api/schools
 * PUBLIC - no auth required
 */
const getSchools = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';

  const { schools, total } = await School.getAll({ page, limit, search });

  const formattedSchools = schools.map(school => ({
    schoolId: school.school_id,
    uuid: school.uuid,
    name: school.name,
    shortName: school.short_name,
    logoUrl: school.logo_url,
    location: school.location,
    website: school.website,
    memberCount: parseInt(school.member_count) || 0,
    createdAt: school.created_at
  }));

  return paginatedResponse(res, formattedSchools, { page, limit, total });
});

/**
 * Get school by UUID with details
 * GET /api/schools/:uuid
 * PUBLIC - no auth required
 */
const getSchool = asyncHandler(async (req, res) => {
  const school = await School.getWithDetails(req.params.uuid);

  if (!school) {
    return notFoundResponse(res, 'School');
  }

  return successResponse(res, {
    school: {
      uuid: school.uuid,
      name: school.name,
      shortName: school.short_name,
      logoUrl: school.logo_url,
      location: school.location,
      website: school.website,
      memberCount: school.member_count,
      createdAt: school.created_at,
      recentMembers: school.recent_members.map(m => ({
        uuid: m.uuid,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        classGrade: m.class_grade,
        role: m.role
      })),
      classes: school.classes.map(c => ({
        uuid: c.uuid,
        name: c.name,
        gradeLevel: c.grade_level,
        academicYear: c.academic_year,
        memberCount: parseInt(c.member_count) || 0
      }))
    }
  });
});

/**
 * Get members from a school
 * GET /api/schools/:uuid/members
 * PUBLIC - no auth required
 */
const getSchoolMembers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const school = await School.findByUuid(req.params.uuid);

  if (!school) {
    return notFoundResponse(res, 'School');
  }

  const { members, total } = await School.getMembers(school.school_id, { page, limit });

  const formattedMembers = members.map(m => ({
    uuid: m.uuid,
    fullName: m.full_name,
    avatarUrl: m.avatar_url,
    classGrade: m.class_grade,
    role: m.role,
    bio: m.bio,
    className: m.class_name,
    classUuid: m.class_uuid,
    createdAt: m.created_at
  }));

  return paginatedResponse(res, formattedMembers, { page, limit, total });
});

/**
 * Search schools (for dropdown/autocomplete)
 * GET /api/schools/search
 * PUBLIC - no auth required
 */
const searchSchools = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const limit = parseInt(req.query.limit) || 10;

  const schools = await School.search(query, limit);

  const formattedSchools = schools.map(school => ({
    uuid: school.uuid,
    name: school.name,
    shortName: school.short_name,
    logoUrl: school.logo_url
  }));

  return successResponse(res, { schools: formattedSchools });
});

/**
 * Create a new school
 * POST /api/schools
 * PROTECTED - director only
 */
const createSchool = asyncHandler(async (req, res) => {
  if (!req.member || req.member.role !== 'director') {
    return forbiddenResponse(res, 'Only directors can create schools');
  }

  const { name, shortName, logoUrl, location, website } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'School name is required'
    });
  }

  // Check if school with same name exists
  const existing = await School.findByName(name);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'A school with this name already exists'
    });
  }

  const school = await School.create({
    name: name.trim(),
    shortName: shortName?.trim() || null,
    logoUrl: logoUrl || null,
    location: location?.trim() || null,
    website: website?.trim() || null
  });

  return createdResponse(res, {
    school: {
      uuid: school.uuid,
      name: school.name,
      shortName: school.short_name,
      logoUrl: school.logo_url,
      location: school.location,
      website: school.website,
      createdAt: school.created_at
    }
  }, 'School created successfully');
});

/**
 * Update a school
 * PUT /api/schools/:uuid
 * PROTECTED - director only
 */
const updateSchool = asyncHandler(async (req, res) => {
  if (!req.member || req.member.role !== 'director') {
    return forbiddenResponse(res, 'Only directors can update schools');
  }

  const school = await School.findByUuid(req.params.uuid);
  if (!school) {
    return notFoundResponse(res, 'School');
  }

  const { name, shortName, logoUrl, location, website } = req.body;

  // If changing name, check it's not taken
  if (name && name !== school.name) {
    const existing = await School.findByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A school with this name already exists'
      });
    }
  }

  const updated = await School.update(school.school_id, {
    name: name?.trim(),
    shortName: shortName?.trim(),
    logoUrl,
    location: location?.trim(),
    website: website?.trim()
  });

  return successResponse(res, {
    school: {
      uuid: updated.uuid,
      name: updated.name,
      shortName: updated.short_name,
      logoUrl: updated.logo_url,
      location: updated.location,
      website: updated.website,
      updatedAt: updated.updated_at
    }
  }, 'School updated successfully');
});

module.exports = {
  getSchools,
  getSchool,
  getSchoolMembers,
  searchSchools,
  createSchool,
  updateSchool
};
