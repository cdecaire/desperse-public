import { createError, defineEventHandler, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { refreshLeaderboardSnapshots } = await import('@/server/jobs/leaderboard-refresh')
  const summary = await refreshLeaderboardSnapshots()
  return { success: true, ...summary }
})
