import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withOptionalAuth } from '@/server/auth'
import {
  LEADERBOARD_ALGORITHM_VERSION,
  LEADERBOARD_PERIODS,
  LEADERBOARD_VIEWS,
} from '@/server/utils/leaderboard-config'
import { getLeaderboardPage } from '@/server/utils/leaderboard'

const leaderboardSchema = z.object({
  view: z.enum(LEADERBOARD_VIEWS).default('creators'),
  period: z.enum(LEADERBOARD_PERIODS).default('30d'),
  category: z.string().max(80).optional(),
  cursor: z.string().max(512).nullable().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

export const getLeaderboard = createServerFn({ method: 'GET' }).handler(async (input: unknown) => {
  try {
    const result = await withOptionalAuth(leaderboardSchema, input)
    return await getLeaderboardPage({
      ...result.input,
      viewerUserId: result.auth?.userId,
    })
  } catch (error) {
    console.error('[getLeaderboard] Failed:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false as const,
      error: 'Failed to load the leaderboard.',
      algorithmVersion: LEADERBOARD_ALGORITHM_VERSION,
      generatedAt: null,
      view: 'creators' as const,
      period: '30d' as const,
      category: null,
      availableViews: ['creators', 'collectors'] as const,
      entries: [],
      nextCursor: null,
    }
  }
})
