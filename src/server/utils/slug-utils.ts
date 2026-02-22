/**
 * Username slug generation utilities
 * Handles slug normalization and collision detection
 */

import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq, like } from 'drizzle-orm'

/**
 * Normalize a string to a valid username slug
 * - Lowercase
 * - Strip emojis and non URL-safe characters
 * - Keep only [a-z0-9_.-]
 * - Limit length to 32 characters
 */
export function normalizeSlug(input: string): string {
  return (
    input
      // Convert to lowercase
      .toLowerCase()
      // Remove emojis and other unicode characters
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Keep only allowed characters [a-z0-9_.-]
      .replace(/[^a-z0-9_.-]/g, '')
      // Remove consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
      // Limit length
      .slice(0, 32)
      // Ensure we have something
      || 'user'
  )
}

/**
 * Check if a slug is already taken
 */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameSlug, slug))
    .limit(1)

  return existing.length > 0
}

/**
 * Generate a unique slug by appending numbers if needed
 * e.g., "john" → "john-1" → "john-2" if collisions occur
 */
export async function generateUniqueSlug(baseName: string): Promise<string> {
  const normalizedBase = normalizeSlug(baseName)

  // Check if base slug is available
  if (!(await isSlugTaken(normalizedBase))) {
    return normalizedBase
  }

  // Find existing slugs that start with the base
  // This helps us determine the next available number
  const existingSlugs = await db
    .select({ usernameSlug: users.usernameSlug })
    .from(users)
    .where(like(users.usernameSlug, `${normalizedBase}%`))

  // Find the highest number suffix
  let maxSuffix = 0
  const suffixPattern = new RegExp(`^${normalizedBase}-(\\d+)$`)

  for (const { usernameSlug } of existingSlugs) {
    const match = usernameSlug.match(suffixPattern)
    if (match) {
      const suffix = Number.parseInt(match[1], 10)
      if (suffix > maxSuffix) {
        maxSuffix = suffix
      }
    }
  }

  // Generate the next slug
  const newSlug = `${normalizedBase}-${maxSuffix + 1}`

  // Double-check it's unique (handles race conditions)
  if (await isSlugTaken(newSlug)) {
    // Very rare case - use timestamp as fallback
    return `${normalizedBase}-${Date.now().toString(36)}`
  }

  return newSlug
}

/**
 * Validate a slug format
 * Returns true if the slug matches the required pattern
 */
export function isValidSlugFormat(slug: string): boolean {
  // Must be 1-32 characters, only [a-z0-9_.-]
  const pattern = /^[a-z0-9_.-]{1,32}$/
  return pattern.test(slug)
}

