import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { useBlockedUsers, useUnblockUser } from '@/hooks/useBlocks'

export const Route = createFileRoute('/settings/account/blocked-users')({
  component: BlockedUsersPage,
})

function BlockedUsersPage() {
  const { data, isLoading, error } = useBlockedUsers()
  const unblockMutation = useUnblockUser()

  return (
    <div className="space-y-4 pt-4">
      <PageHeader
        title="Blocked Accounts"
        description="People you've blocked. They can't see your profile or posts, and you can't see theirs."
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-body-sm text-muted-foreground py-4">
          Couldn't load your blocked accounts. Try again in a moment.
        </p>
      ) : !data || data.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-10 text-center">
          <Icon name="ban" variant="regular" className="text-3xl text-muted-foreground" />
          <p className="mt-3 text-label-lg">No blocked accounts</p>
          <p className="mt-1 text-caption text-muted-foreground">
            Anyone you block from a post or profile will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input divide-y divide-border overflow-hidden">
          {data.map((blocked) => (
            <div
              key={blocked.id}
              className="flex items-center gap-3 px-5 md:px-6 py-3"
            >
              <Link
                to="/profile/$slug"
                params={{ slug: blocked.slug }}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {blocked.avatarUrl ? (
                    <img
                      src={blocked.avatarUrl}
                      alt={blocked.displayName || blocked.slug}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon name="user" variant="regular" className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-label-lg truncate">
                    {blocked.displayName || blocked.slug}
                  </span>
                  <span className="text-caption text-muted-foreground truncate">
                    @{blocked.slug}
                  </span>
                </div>
              </Link>
              <Button
                variant="outline"
                disabled={unblockMutation.isPending}
                onClick={() =>
                  unblockMutation.mutate({
                    targetUserId: blocked.id,
                    displayLabel: `@${blocked.slug}`,
                  })
                }
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
