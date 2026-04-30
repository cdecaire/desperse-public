/**
 * Block server functions
 * Block / unblock / list-blocked-users createServerFn wrappers for the web SPA.
 *
 * DB logic intentionally lives in @/server/utils/blocks — keeps this file
 * inside the boundary rules (no direct DB / drizzle imports in functions/).
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
import {
  createBlock,
  deleteBlock,
  listBlockedUsers,
  type BlockedUserSummary,
} from '@/server/utils/blocks'

const blockSchema = z.object({
  targetUserId: z.string().uuid(),
})

export const blockUser = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    let authResult
    try {
      authResult = await withAuth(blockSchema, input)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[blockUser] Auth error:', message)
      return { success: false as const, error: message }
    }
    if (!authResult) {
      return { success: false as const, error: 'Authentication required' }
    }
    const { auth, input: data } = authResult
    try {
      await createBlock(auth.userId, data.targetUserId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to block user'
      console.warn('[blockUser]', message)
      return { success: false as const, error: message }
    }
    return { success: true as const, isBlocked: true }
  } catch (error) {
    console.error('[blockUser] Unexpected error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to block user',
    }
  }
})

export const unblockUser = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    let authResult
    try {
      authResult = await withAuth(blockSchema, input)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[unblockUser] Auth error:', message)
      return { success: false as const, error: message }
    }
    if (!authResult) {
      return { success: false as const, error: 'Authentication required' }
    }
    const { auth, input: data } = authResult
    await deleteBlock(auth.userId, data.targetUserId)
    return { success: true as const, isBlocked: false }
  } catch (error) {
    console.error('[unblockUser] Unexpected error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to unblock user',
    }
  }
})

const emptySchema = z.object({}).passthrough()

export const getBlockedUsers = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    let authResult
    try {
      authResult = await withAuth(emptySchema, input)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[getBlockedUsers] Auth error:', message)
      return { success: false as const, error: message, users: [] as BlockedUserSummary[] }
    }
    if (!authResult) {
      return { success: false as const, error: 'Authentication required', users: [] as BlockedUserSummary[] }
    }
    const users = await listBlockedUsers(authResult.auth.userId)
    return { success: true as const, users }
  } catch (error) {
    console.error('[getBlockedUsers] Unexpected error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to load blocked users',
      users: [] as BlockedUserSummary[],
    }
  }
})
