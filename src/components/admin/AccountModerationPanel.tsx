import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Row, Stack } from '@cdecaire/sable/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  changeModeratedAccountStatus,
  getModeratedAccount,
} from '@/server/functions/account-moderation'
import { formatRelativeTime } from '@/lib/dates'

type UserStatus = 'active' | 'flagged' | 'banned'

const statusVariant = {
  active: 'success',
  flagged: 'warning',
  banned: 'destructive',
} as const

export function AccountModerationPanel({
  subjectUserId,
  linkedReportId,
  viewerRole,
}: {
  subjectUserId: string
  linkedReportId?: string | null
  viewerRole: 'moderator' | 'admin'
}) {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()
  const [nextStatus, setNextStatus] = useState<UserStatus | null>(null)
  const [reason, setReason] = useState('')

  const contextQuery = useQuery({
    queryKey: ['admin', 'account-moderation', subjectUserId],
    queryFn: async () => {
      const auth = await getAuthHeaders()
      const result = await getModeratedAccount({
        data: { subjectUserId, _authorization: auth.Authorization },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to load account status.')
      return result.context
    },
    staleTime: 0,
  })

  const mutation = useMutation({
    mutationFn: async (input: { expectedStatus: UserStatus; nextStatus: UserStatus; reason: string }) => {
      const auth = await getAuthHeaders()
      const result = await changeModeratedAccountStatus({
        data: {
          subjectUserId,
          linkedReportId,
          ...input,
          _authorization: auth.Authorization,
        },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to update account status.')
      return result
    },
    onSuccess: () => {
      toast.success('Account status updated')
      setNextStatus(null)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'account-moderation', subjectUserId] })
    },
    onError: (error) => toast.error(error.message),
  })

  if (contextQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Row align="center" gap={1.5}><LoadingSpinner size="sm" /><span className="text-body-sm text-muted-foreground">Loading account status…</span></Row>
      </div>
    )
  }
  if (contextQuery.error || !contextQuery.data) return null

  const context = contextQuery.data
  const currentStatus = context.user.status as UserStatus
  const displayName = context.user.displayName || `@${context.user.usernameSlug}`
  const actionLabel = nextStatus === 'flagged'
    ? 'Flag account'
    : nextStatus === 'banned'
      ? 'Ban account'
      : 'Restore account'

  return (
    <>
      <section className="rounded-lg border bg-card p-4" aria-labelledby="account-status-heading">
        <Row align="start" justify="between" className="gap-4">
          <div>
            <h2 id="account-status-heading" className="text-title-lg">Account status</h2>
            <p className="mt-1 text-caption text-muted-foreground">
              Account actions are separate from resolving this content report.
            </p>
          </div>
          <Badge variant={statusVariant[currentStatus]}>{currentStatus}</Badge>
        </Row>

        <Row align="center" gap={1.5} className="mt-4">
		  <UserAvatar src={context.user.avatarUrl} seed={context.user.usernameSlug} size="md" />
          <div className="min-w-0">
            <p className="truncate text-label-lg">{displayName}</p>
            <p className="truncate text-caption text-muted-foreground">@{context.user.usernameSlug}</p>
          </div>
        </Row>

        {context.user.flaggedReason && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-body-sm">
            <span className="font-semibold">Current reason:</span> {context.user.flaggedReason}
          </p>
        )}

        <Row gap={1} wrap className="mt-4">
          {currentStatus === 'active' && (
            <Button variant="outline" onClick={() => setNextStatus('flagged')}>
              <Icon name="flag" variant="regular" className="mr-2" /> Flag account
            </Button>
          )}
          {currentStatus === 'flagged' && (
            <Button variant="outline" onClick={() => setNextStatus('active')}>
              <Icon name="rotate-left" variant="regular" className="mr-2" /> Restore active
            </Button>
          )}
          {currentStatus === 'banned' && viewerRole === 'admin' && (
            <Button variant="outline" onClick={() => setNextStatus('active')}>
              <Icon name="rotate-left" variant="regular" className="mr-2" /> Restore active
            </Button>
          )}
          {currentStatus !== 'banned' && viewerRole === 'admin' && (
            <Button variant="destructive" onClick={() => setNextStatus('banned')}>
              <Icon name="ban" variant="regular" className="mr-2" /> Ban account
            </Button>
          )}
        </Row>

        {context.actions.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <h3 className="text-label-lg">Account history</h3>
            <Stack gap={1} className="mt-2">
              {context.actions.map((action) => (
                <div key={action.id} className="rounded-md bg-muted/50 px-3 py-2 text-body-sm">
                  <p>
                    <span className="font-semibold">{action.previousStatus} → {action.nextStatus}</span>
                    {' '}by {action.actor.displayName || `@${action.actor.usernameSlug}`}
                  </p>
                  <p className="text-muted-foreground">{action.reason}</p>
                  <time dateTime={action.createdAt} className="text-caption text-muted-foreground">
                    {formatRelativeTime(action.createdAt)}
                  </time>
                </div>
              ))}
            </Stack>
          </div>
        )}
      </section>

      <Dialog open={nextStatus !== null} onOpenChange={(open) => !open && setNextStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription>
              {nextStatus === 'active'
                ? 'The account can return to public discovery after the next valid snapshot.'
                : 'The account will be removed from public Leaderboard results immediately.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder={nextStatus === 'active' ? 'Resolution note…' : 'Required moderation reason…'}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNextStatus(null); setReason('') }}>Cancel</Button>
            <Button
              variant={nextStatus === 'banned' ? 'destructive' : 'default'}
              disabled={reason.trim().length < 3 || mutation.isPending || !nextStatus}
              onClick={() => nextStatus && mutation.mutate({
                expectedStatus: currentStatus,
                nextStatus,
                reason: reason.trim(),
              })}
            >
              {mutation.isPending ? 'Saving…' : actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
