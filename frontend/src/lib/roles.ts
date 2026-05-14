/**
 * AquaTerra Role Utilities
 *
 * "Director" and "HoD" are two distinct real-world roles with identical website powers.
 * "super_admin" has all powers.
 * Never add special-case checks for each — always use these helpers.
 */

/** Roles that have HoD-level access (moderation, approvals, team management) */
export const LEADER_ROLES = ['director', 'hod', 'super_admin'] as const
export type LeaderRole = (typeof LEADER_ROLES)[number]

/** True if a member has HoD/Director/SuperAdmin powers */
export function hasLeaderAccess(role?: string | null): boolean {
  return LEADER_ROLES.includes(role as LeaderRole)
}

/** True if specifically super_admin */
export function isSuperAdmin(role?: string | null): boolean {
  return role === 'super_admin'
}

/** Display label for a role */
export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'super_admin': return 'Super Admin'
    case 'hod':         return 'HoD'
    case 'director':    return 'Director'
    case 'lead':        return 'Team Lead'
    default:            return 'Member'
  }
}

/** CSS class suffix for role chips */
export function getRoleClass(role?: string | null): string {
  if (role === 'hod' || role === 'director' || role === 'super_admin') return 'role-director'
  if (role === 'lead') return 'role-lead'
  return 'role-member'
}
