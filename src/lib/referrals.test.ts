import { describe, expect, it } from 'vitest'

import {
  buildReferralShareCardSvg,
  getCurrentReferralTierLabel,
  getNextReferralMilestone,
  getPublicReferralStatus,
  getReferralLeaderboardStatus,
  getReferralListState,
  getReferralStateLabel,
  rankReferralLeaderboardEntries,
} from '@/lib/referrals'

describe('referral helpers', () => {
  it('maps backend states to owner-list states', () => {
    expect(getReferralListState('account_created')).toBe('pending_activation')
    expect(getReferralListState('pending_activation')).toBe('pending_activation')
    expect(getReferralListState('activated')).toBe('activated')
    expect(getReferralListState('rejected')).toBe('did_not_qualify')
    expect(getReferralListState('revoked')).toBe('removed_after_review')
    expect(getReferralListState('expired')).toBe('expired')
  })

  it('returns the next milestone and current tier label', () => {
    expect(getNextReferralMilestone(0)).toMatchObject({ target: 1, label: 'First Signal badge' })
    expect(getNextReferralMilestone(3)).toMatchObject({ target: 5, label: 'Profile accent' })
    expect(getNextReferralMilestone(10)).toBeNull()
    expect(getCurrentReferralTierLabel(0)).toBe('Invite in progress')
    expect(getCurrentReferralTierLabel(1)).toBe('First Signal')
    expect(getCurrentReferralTierLabel(3)).toBe('Custom invite code unlocked')
    expect(getCurrentReferralTierLabel(10)).toBe('Connector')
  })

  it('derives public profile status only after an activation', () => {
    expect(getPublicReferralStatus(0)).toBeNull()
    expect(getPublicReferralStatus(1)).toEqual({
      activatedCount: 1,
      badgeLabel: 'First Signal',
      hasAccent: false,
      hasFrame: false,
    })
    expect(getPublicReferralStatus(5)).toMatchObject({ badgeLabel: 'First Signal', hasAccent: true })
    expect(getPublicReferralStatus(10)).toMatchObject({ badgeLabel: 'Connector', hasAccent: true })
    expect(getPublicReferralStatus(25)).toMatchObject({ badgeLabel: 'Connector', hasFrame: true })
  })

  it('derives Top Connectors states for ineligible, awaiting, ranked, and excluded users', () => {
    expect(getReferralLeaderboardStatus({ totalActivatedCount: 9, weeklyActivatedCount: 3, rank: null, excluded: false }))
      .toEqual({ state: 'ineligible', remainingToQualify: 1 })
    expect(getReferralLeaderboardStatus({ totalActivatedCount: 10, weeklyActivatedCount: 0, rank: null, excluded: false }))
      .toEqual({ state: 'awaiting' })
    expect(getReferralLeaderboardStatus({ totalActivatedCount: 12, weeklyActivatedCount: 2, rank: 4, excluded: false }))
      .toEqual({ state: 'ranked', rank: 4 })
    expect(getReferralLeaderboardStatus({ totalActivatedCount: 20, weeklyActivatedCount: 8, rank: null, excluded: true }))
      .toEqual({ state: 'review-held' })
  })

  it('ranks only qualified, non-excluded connectors by weekly activations', () => {
    const ranked = rankReferralLeaderboardEntries([
      { userId: 'b', usernameSlug: 'beta', displayName: 'Beta', avatarUrl: null, totalActivatedCount: 15, weeklyActivatedCount: 2, excluded: false },
      { userId: 'a', usernameSlug: 'alpha', displayName: 'Alpha', avatarUrl: null, totalActivatedCount: 12, weeklyActivatedCount: 4, excluded: false },
      { userId: 'c', usernameSlug: 'charlie', displayName: 'Charlie', avatarUrl: null, totalActivatedCount: 30, weeklyActivatedCount: 9, excluded: true },
      { userId: 'd', usernameSlug: 'delta', displayName: 'Delta', avatarUrl: null, totalActivatedCount: 9, weeklyActivatedCount: 5, excluded: false },
    ])

    expect(ranked.map(({ userId, rank }) => ({ userId, rank }))).toEqual([
      { userId: 'a', rank: 1 },
      { userId: 'b', rank: 2 },
    ])
  })

  it('builds a personalized share card svg with invite details', () => {
    const svg = buildReferralShareCardSvg({
      displayName: 'Carl',
      handle: 'carl',
      bio: 'Building things on Solana.',
      avatarUrl: 'https://example.com/avatar.png',
      inviteCode: 'carl',
      inviteLink: 'https://desperse.app/i/carl',
      qrCodeUrl: 'https://example.com/qr.png',
      badgeLabel: 'First Signal',
    })

    expect(svg).toContain('Carl')
    expect(svg).toContain('@carl')
    expect(svg).toContain('Building things on Solana.')
    expect(svg).toContain('https://example.com/avatar.png')
    expect(svg).toContain('https://desperse.app/i/carl')
    expect(svg).toContain('Scan to join')
    expect(svg).toContain('First Signal')
  })

  it('keeps user-facing labels stable', () => {
    expect(getReferralStateLabel('pending_activation')).toBe('Pending activation')
    expect(getReferralStateLabel('did_not_qualify')).toBe('Did not qualify')
    expect(getReferralStateLabel('removed_after_review')).toBe('Removed after review')
  })
})
