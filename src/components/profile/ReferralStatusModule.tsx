import { Link } from '@tanstack/react-router'
import { Row, Stack } from '@cdecaire/sable/layout'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import type { PublicReferralStatus } from '@/lib/referrals'

export function ReferralStatusModule({
  status,
  isOwner,
}: {
  status: PublicReferralStatus
  isOwner: boolean
}) {
  return (
    <div
      className={`mx-4 mt-4 rounded-xl border p-4 ${
        status.hasAccent
          ? 'border-primary/40 bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]'
          : 'border-border bg-card/50'
      }`}
      data-testid="referral-status-module"
    >
      <Row justify="between" align="center" gap={2} wrap>
        <Stack gap={0.5}>
          <Row gap={1} align="center" wrap>
            <Badge variant={status.badgeLabel === 'Connector' ? 'default' : 'secondary'}>
              <Icon name="users" variant="solid" className="mr-1" />
              {status.badgeLabel}
            </Badge>
            <span className="text-label-lg">
              {status.activatedCount} activated {status.activatedCount === 1 ? 'invite' : 'invites'}
            </span>
          </Row>
          <p className="text-body-sm text-muted-foreground">
            Recognized for bringing real people into Desperse.
          </p>
        </Stack>

        {isOwner && (
          <Link to="/settings/invites">
            <Button variant="outline">Manage invites</Button>
          </Link>
        )}
      </Row>
    </div>
  )
}
