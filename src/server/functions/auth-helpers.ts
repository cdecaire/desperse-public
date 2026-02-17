/**
 * Authentication and authorization helpers for server functions
 * Provides role-based access control utilities
 */

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export type UserRole = 'user' | 'moderator' | 'admin';

/**
 * Get user by ID with role information
 */
export async function getUserWithRole(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      walletAddress: users.walletAddress,
      usernameSlug: users.usernameSlug,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const user = await getUserWithRole(userId);
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
  };

  return roleHierarchy[user.role] >= roleHierarchy[role];
}

/**
 * Check if user is moderator or admin
 */
export async function isModeratorOrAdmin(userId: string): Promise<boolean> {
  const user = await getUserWithRole(userId);
  if (!user) return false;
  return user.role === 'moderator' || user.role === 'admin';
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await getUserWithRole(userId);
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Require user to have a specific role, throw error if not
 * @throws Error if user doesn't have the required role
 */
export async function requireRole(userId: string, role: UserRole): Promise<void> {
  const hasRequiredRole = await hasRole(userId, role);
  if (!hasRequiredRole) {
    const user = await getUserWithRole(userId);
    throw new Error(
      `Access denied. Required role: ${role}, user role: ${user?.role || 'unknown'}`,
    );
  }
}

/**
 * Require user to be moderator or admin, throw error if not
 * @throws Error if user is not moderator or admin
 */
export async function requireModerator(userId: string): Promise<void> {
  const isMod = await isModeratorOrAdmin(userId);
  if (!isMod) {
    throw new Error('Access denied. Moderator or admin role required.');
  }
}

/**
 * Require user to be admin, throw error if not
 * @throws Error if user is not admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isAdm = await isAdmin(userId);
  if (!isAdm) {
    throw new Error('Access denied. Admin role required.');
  }
}

