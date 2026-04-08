const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { transformArray } = require('../utils/caseTransform');

/**
 * Global search across members, projects, teams, schools
 * GET /api/search
 */
const search = asyncHandler(async (req, res) => {
  const { q: query, type = 'all', limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    return errorResponse(res, 'Search query must be at least 2 characters', 400);
  }

  const searchTerm = `%${query.trim()}%`;
  const results = {
    people: [],
    projects: [],
    teams: [],
    schools: []
  };

  // Search People (Members)
  if (type === 'all' || type === 'people') {
    const peopleResult = await pool.query(
      `SELECT member_id, uuid, full_name, avatar_url, email, class_grade, role, bio
       FROM members
       WHERE status = 'active' AND is_active = TRUE
       AND (full_name ILIKE $1 OR email ILIKE $1 OR bio ILIKE $1)
       ORDER BY full_name
       LIMIT $2`,
      [searchTerm, parseInt(limit)]
    );
    results.people = transformArray(peopleResult.rows);
  }

  // Search Projects
  if (type === 'all' || type === 'projects') {
    const projectsResult = await pool.query(
      `SELECT p.uuid, p.title, p.description, p.category, p.status, p.cover_image_url,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) as member_count
       FROM projects p
       WHERE p.title ILIKE $1 OR p.description ILIKE $1
       ORDER BY p.created_at DESC
       LIMIT $2`,
      [searchTerm, parseInt(limit)]
    );
    results.projects = transformArray(projectsResult.rows);
  }

  // Search Teams
  if (type === 'all' || type === 'teams') {
    const teamsResult = await pool.query(
      `SELECT t.uuid, t.name, t.description, t.category, t.logo_url,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = TRUE) as member_count
       FROM teams t
       WHERE t.is_active = TRUE
       AND (t.name ILIKE $1 OR t.description ILIKE $1)
       ORDER BY t.name
       LIMIT $2`,
      [searchTerm, parseInt(limit)]
    );
    results.teams = transformArray(teamsResult.rows);
  }

  // Search Schools
  if (type === 'all' || type === 'schools') {
    const schoolsResult = await pool.query(
      `SELECT s.uuid, s.name, s.short_name, s.logo_url, s.location,
              (SELECT COUNT(*) FROM members m WHERE m.school_id = s.school_id AND m.status = 'active') as member_count
       FROM schools s
       WHERE s.name ILIKE $1 OR s.short_name ILIKE $1 OR s.location ILIKE $1
       ORDER BY s.name
       LIMIT $2`,
      [searchTerm, parseInt(limit)]
    );
    results.schools = transformArray(schoolsResult.rows);
  }

  // Calculate total count
  const totalCount = results.people.length + results.projects.length +
                     results.teams.length + results.schools.length;

  return successResponse(res, {
    query: query.trim(),
    type,
    totalCount,
    results
  });
});

/**
 * Quick search for autocomplete suggestions
 * GET /api/search/quick
 */
const quickSearch = asyncHandler(async (req, res) => {
  const { q: query, limit = 5 } = req.query;

  if (!query || query.trim().length < 2) {
    return successResponse(res, { suggestions: [] });
  }

  const searchTerm = `%${query.trim()}%`;
  const suggestions = [];

  // Get top matches from each category
  const [people, projects, teams] = await Promise.all([
    pool.query(
      `SELECT uuid, full_name as name, 'person' as type, avatar_url as image
       FROM members
       WHERE status = 'active' AND is_active = TRUE AND full_name ILIKE $1
       ORDER BY full_name LIMIT $2`,
      [searchTerm, parseInt(limit)]
    ),
    pool.query(
      `SELECT uuid, title as name, 'project' as type, cover_image_url as image
       FROM projects WHERE title ILIKE $1
       ORDER BY title LIMIT $2`,
      [searchTerm, parseInt(limit)]
    ),
    pool.query(
      `SELECT uuid, name, 'team' as type, logo_url as image
       FROM teams WHERE is_active = TRUE AND name ILIKE $1
       ORDER BY name LIMIT $2`,
      [searchTerm, parseInt(limit)]
    )
  ]);

  // Combine and format results
  people.rows.forEach(row => suggestions.push({
    uuid: row.uuid,
    name: row.name,
    type: 'person',
    image: row.image
  }));

  projects.rows.forEach(row => suggestions.push({
    uuid: row.uuid,
    name: row.name,
    type: 'project',
    image: row.image
  }));

  teams.rows.forEach(row => suggestions.push({
    uuid: row.uuid,
    name: row.name,
    type: 'team',
    image: row.image
  }));

  return successResponse(res, { suggestions });
});

module.exports = {
  search,
  quickSearch
};
