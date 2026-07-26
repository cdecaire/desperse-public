/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReferralLeaderboard } from './useReferrals'

const mocks = vi.hoisted(() => ({
  isAuthenticated: false,
  user: null as { id: string } | null,
  getAuthHeaders: vi.fn(),
  getReferralLeaderboard: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mocks.isAuthenticated,
    getAuthHeaders: mocks.getAuthHeaders,
  }),
}))

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mocks.user }),
}))

vi.mock('@/server/functions/referrals', () => ({
  getPublicReferralProfileStatus: vi.fn(),
  getReferralLeaderboard: mocks.getReferralLeaderboard,
  getReferralOwnerDashboard: vi.fn(),
}))

describe('useReferralLeaderboard', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.isAuthenticated = false
    mocks.user = null
    mocks.getAuthHeaders.mockReset()
    mocks.getReferralLeaderboard.mockReset()
    mocks.getReferralLeaderboard.mockResolvedValue({ success: true })
  })

  it('refetches with authorization when the restored user identity changes the query key', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { rerender } = renderHook(() => useReferralLeaderboard(), { wrapper })

    await waitFor(() => expect(mocks.getReferralLeaderboard).toHaveBeenCalledTimes(1))
    expect(mocks.getReferralLeaderboard).toHaveBeenLastCalledWith({ data: {} })
    expect(mocks.getAuthHeaders).not.toHaveBeenCalled()

    mocks.isAuthenticated = true
    mocks.user = { id: 'user-1' }
    mocks.getAuthHeaders.mockResolvedValue({ Authorization: 'Bearer restored-session' })
    rerender()

    await waitFor(() => expect(mocks.getReferralLeaderboard).toHaveBeenCalledTimes(2))
    expect(mocks.getAuthHeaders).toHaveBeenCalledTimes(1)
    expect(mocks.getReferralLeaderboard).toHaveBeenLastCalledWith({
      data: { _authorization: 'Bearer restored-session' },
    })
  })
})
