import { describe, expect, it } from 'vitest'
import { decodeLeaderboardCursor, encodeLeaderboardCursor } from './leaderboard'
import {
  categoryNameToScope,
  COLLECTOR_SCORE_WEIGHTS,
  CREATOR_SCORE_WEIGHTS,
  getLeaderboardBucketStart,
  normalizeLeaderboardCategory,
} from './leaderboard-config'

describe('leaderboard configuration', () => {
  it('keeps the v3 score weights explicit and stable', () => {
    expect(CREATOR_SCORE_WEIGHTS).toEqual({
      paidEdition: 6,
      freeCollect: 2,
      uniqueSupporter: 3,
      like: 1,
      newFollower: 1,
    })
    expect(COLLECTOR_SCORE_WEIGHTS).toEqual({
      paidEdition: 6,
      freeCollect: 2,
      like: 1,
      distinctCreator: 3,
    })
  })

  it('normalizes public category scopes', () => {
    expect(normalizeLeaderboardCategory('photography')).toBe('photography')
    expect(normalizeLeaderboardCategory('not-a-category')).toBe('all')
    expect(categoryNameToScope('Photography')).toBe('photography')
    expect(categoryNameToScope('Unknown')).toBeNull()
  })

  it('uses deterministic two-hour buckets', () => {
    expect(getLeaderboardBucketStart(new Date('2026-07-11T05:59:59.000Z')).toISOString())
      .toBe('2026-07-11T04:00:00.000Z')
  })
})

describe('leaderboard cursors', () => {
  it('round-trips a stable snapshot cursor', () => {
    const cursor = {
      snapshotId: '123e4567-e89b-42d3-a456-426614174000',
      rank: 20,
    }
    expect(decodeLeaderboardCursor(encodeLeaderboardCursor(cursor))).toEqual(cursor)
  })

  it('rejects malformed cursors', () => {
    expect(decodeLeaderboardCursor('not-base64-json')).toBeNull()
    expect(decodeLeaderboardCursor(encodeLeaderboardCursor({
      snapshotId: 'not-a-uuid',
      rank: 2,
    }))).toBeNull()
  })
})
