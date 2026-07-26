import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { useAuth } from '@/hooks/useAuth'
import {
  listReferralInviteCodesForModeration,
  retireReferralCodeForModeration,
  searchReferralModeration,
  setReferralLeaderboardExclusion,
} from '@/server/functions/referral-admin'

export const Route = createFileRoute('/admin/referrals')({ component: ReferralModerationPage })

function ReferralModerationPage() {
  const { getAuthHeaders } = useAuth()
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null)

  const search = useQuery({
    queryKey: ['admin', 'referrals', query],
    enabled: query.length > 0,
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const result = await searchReferralModeration({ data: { query, _authorization: headers.Authorization } } as any)
      if (!result.success) throw new Error(result.error)
      return { referrals: result.referrals, inviteCodes: result.inviteCodes }
    },
  })

  const codes = useQuery({
    queryKey: ['admin', 'referral-codes', selectedReferrerId],
    enabled: Boolean(selectedReferrerId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const result = await listReferralInviteCodesForModeration({
        data: { userId: selectedReferrerId, _authorization: headers.Authorization },
      } as any)
      if (!result.success) throw new Error(result.error)
      return result.codes
    },
  })

  const setExclusion = useMutation({
    mutationFn: async ({ targetUserId, excluded }: { targetUserId: string; excluded: boolean }) => {
      const reason = window.prompt(
        excluded ? 'Reason for excluding this user from the leaderboard:' : 'Reason for restoring this user to the leaderboard:',
      )?.trim()
      if (!reason) throw new Error('A reason is required')
      const headers = await getAuthHeaders()
      const result = await setReferralLeaderboardExclusion({
        data: { targetUserId, excluded, reason, _authorization: headers.Authorization },
      } as any)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => search.refetch(),
  })

  const retireCode = useMutation({
    mutationFn: async (codeId: string) => {
      const reason = window.prompt('Reason for retiring this invite code:')?.trim()
      if (!reason) throw new Error('A reason is required')
      const headers = await getAuthHeaders()
      const result = await retireReferralCodeForModeration({
        data: { codeId, reason, _authorization: headers.Authorization },
      } as any)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      codes.refetch()
      search.refetch()
    },
  })

  const error = search.error || setExclusion.error || codes.error || retireCode.error

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-heading-3">Referral moderation</h1>
        <p className="text-body-sm text-muted-foreground">
          Search by referral ID, invite code, username, display name, or user ID. Every action writes an audit event.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const value = draftQuery.trim()
          if (value) setQuery(value)
        }}
      >
        <input
          className="h-10 flex-1 rounded-md border bg-background px-3 text-body-sm"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Referral ID, invite code, username, or user ID"
          aria-label="Search referrals"
        />
        <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground" type="submit">Search</button>
      </form>

      {error && <p className="text-body-sm text-destructive">{error.message}</p>}
      {search.isFetching && <p className="text-body-sm text-muted-foreground">Searching…</p>}
      {query && !search.isFetching && search.data?.referrals.length === 0 && search.data.inviteCodes.length === 0 && (
        <p className="text-body-sm text-muted-foreground">No matching referrals.</p>
      )}

      {search.data?.inviteCodes.length ? (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div>
            <h2 className="font-medium">Matching custom codes</h2>
            <p className="text-body-xs text-muted-foreground">Retired codes stay reserved and cannot be reused.</p>
          </div>
          {search.data.inviteCodes.map((code) => (
            <div key={code.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-mono text-body-sm">{code.code}</p>
                <p className="text-body-xs text-muted-foreground">
                  @{code.owner?.usernameSlug || code.userId} · {code.status}
                </p>
              </div>
              {code.status === 'active' && (
                <button
                  type="button"
                  disabled={retireCode.isPending}
                  className="rounded-md border px-3 py-1.5 text-body-xs hover:bg-muted disabled:opacity-50"
                  onClick={() => retireCode.mutate(code.id)}
                >
                  Retire code
                </button>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <div className="space-y-3">
        {search.data?.referrals.map((referral) => (
          <article key={referral.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{referral.referredUser?.displayName || `@${referral.referredUser?.usernameSlug || referral.referredUserId}`}</p>
                <p className="text-body-xs text-muted-foreground">Referral {referral.id}</p>
                <p className="text-body-xs text-muted-foreground">
                  Referrer: @{referral.referrer?.usernameSlug || referral.referrerUserId} · code: {referral.inviteCode}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full border px-2 py-1 text-body-xs">{referral.state}</span>
                {referral.referrerExcluded && (
                  <p className="mt-2 text-body-xs text-tone-warning">Referrer excluded from leaderboard</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={setExclusion.isPending}
                className="rounded-md border px-3 py-1.5 text-body-xs hover:bg-muted disabled:opacity-50"
                onClick={() => setExclusion.mutate({
                  targetUserId: referral.referrerUserId,
                  excluded: !referral.referrerExcluded,
                })}
              >
                {referral.referrerExcluded
                  ? `Restore @${referral.referrer?.usernameSlug || 'referrer'} to leaderboard`
                  : `Exclude @${referral.referrer?.usernameSlug || 'referrer'} from leaderboard`}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-body-xs hover:bg-muted"
                onClick={() => setSelectedReferrerId(referral.referrerUserId)}
              >
                Manage invite codes
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedReferrerId && (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Custom invite codes</h2>
              <p className="text-body-xs text-muted-foreground">Retired codes remain reserved to prevent impersonation reuse.</p>
            </div>
            <button type="button" className="text-body-xs underline" onClick={() => setSelectedReferrerId(null)}>Close</button>
          </div>
          {codes.isFetching && <p className="text-body-sm text-muted-foreground">Loading codes…</p>}
          {codes.data?.length === 0 && <p className="text-body-sm text-muted-foreground">No custom codes.</p>}
          {codes.data?.map((code) => (
            <div key={code.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-mono text-body-sm">{code.code}</p>
                <p className="text-body-xs text-muted-foreground">{code.status}</p>
              </div>
              {code.status === 'active' && (
                <button
                  type="button"
                  disabled={retireCode.isPending}
                  className="rounded-md border px-3 py-1.5 text-body-xs hover:bg-muted disabled:opacity-50"
                  onClick={() => retireCode.mutate(code.id)}
                >
                  Retire code
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
