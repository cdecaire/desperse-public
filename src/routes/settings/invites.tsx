import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { AuthGuard } from '@/components/shared/AuthGuard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import SettingsNav from '@/components/settings/SettingsNav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from '@/hooks/use-toast'
import { useReferralOwnerDashboard } from '@/hooks/useReferrals'
import { formatRelativeTime } from '@/lib/dates'
import {
  buildInviteLink,
  buildReferralQrCodeUrl,
  buildReferralShareCardSvg,
  buildReferralShareCopy,
  getCurrentReferralTierLabel,
  getNextReferralMilestone,
  getReferralListState,
  getReferralStateBadgeVariant,
  getReferralStateDescription,
  getReferralStateLabel,
} from '@/lib/referrals'

export const Route = createFileRoute('/settings/invites')({
  component: InvitesPage,
})

type ShareSurfaceMode = 'card' | 'qr'
type ReferralOwnerDashboard = NonNullable<ReturnType<typeof useReferralOwnerDashboard>['data']>
type ReferralListItem = ReferralOwnerDashboard['referrals'][number]

function InvitesPage() {
  return (
    <AuthGuard>
      <InvitesPageContent />
    </AuthGuard>
  )
}

function InvitesPageContent() {
  const { data: dashboard, isLoading, error } = useReferralOwnerDashboard()
  const [shareOpen, setShareOpen] = useState(false)
  const [shareMode, setShareMode] = useState<ShareSurfaceMode>('card')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mediaQuery.matches)
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  const origin = typeof window === 'undefined' ? 'https://desperse.com' : window.location.origin
  const inviteLink = dashboard ? buildInviteLink(origin, dashboard.inviteCode) : ''
  const qrCodeUrl = inviteLink ? buildReferralQrCodeUrl(inviteLink, 280) : ''
  const shareCopy = inviteLink ? buildReferralShareCopy(inviteLink) : ''
  const nextMilestone = dashboard ? getNextReferralMilestone(dashboard.activatedCount) : null
  const currentTier = dashboard ? getCurrentReferralTierLabel(dashboard.activatedCount) : 'Invite in progress'
  const shareActionsLocked = Boolean(dashboard && dashboard.remainingSlots <= 0)

  const groupedReferrals = useMemo(() => {
    if (!dashboard) return [] as Array<{ title: string; items: ReferralListItem[] }>

    const pending = dashboard.referrals.filter((referral) => getReferralListState(referral.state) === 'pending_activation')
    const activated = dashboard.referrals.filter((referral) => getReferralListState(referral.state) === 'activated')
    const history = dashboard.referrals.filter((referral) => {
      const state = getReferralListState(referral.state)
      return state === 'did_not_qualify' || state === 'removed_after_review' || state === 'expired'
    })

    return [
      { title: 'Pending activation', items: pending },
      { title: 'Activated', items: activated },
      { title: 'History', items: history },
    ].filter((group) => group.items.length > 0)
  }, [dashboard])

  const openShareSurface = (mode: ShareSurfaceMode) => {
    if (shareActionsLocked) return
    setShareMode(mode)
    setShareOpen(true)
  }

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error('Could not copy right now.')
    }
  }

  const downloadShareCard = () => {
    if (!dashboard) return
    try {
      const svg = buildReferralShareCardSvg({
        displayName: dashboard.owner.displayName,
        inviteCode: dashboard.inviteCode,
        inviteLink,
        qrCodeUrl,
        badgeLabel: currentTier,
      })
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `desperse-invite-${dashboard.inviteCode}.svg`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success('Share card downloaded')
    } catch {
      toast.error('Could not build the share card right now.')
    }
  }

  const nativeShare = async () => {
    if (!dashboard) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Desperse',
          text: shareCopy,
          url: inviteLink,
        })
        return
      } catch {
        // fall through to copy
      }
    }

    await copyText(shareCopy, 'Suggested share copy copied')
  }

  return (
    <div className="flex flex-col md:flex-row items-start flex-1 min-h-screen">
      <aside className="hidden md:flex md:w-64 border-r border-border/80 bg-background self-stretch">
        <div className="sticky top-16 w-full">
          <SettingsNav variant="desktop" />
        </div>
      </aside>

      <div className="flex-1 w-full">
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="grid grid-cols-3 items-center h-14 px-4">
            <div className="flex items-center">
              <Link
                to="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                aria-label="Back to settings"
              >
                <Icon name="arrow-left" />
              </Link>
            </div>
            <div className="flex justify-center min-w-0 flex-1">
              <h1 className="text-title-lg whitespace-nowrap truncate">Invites</h1>
            </div>
            <div aria-hidden="true" />
          </div>
        </header>

        <section className="max-w-5xl space-y-6 px-4 md:px-6 lg:px-8 pt-settings-header">
          <div className="pt-4 pb-10 space-y-6">
            <PageHeader
              title="Invites"
              description="Bring real people into Desperse and track which invites actually activate. Recognition only. No cash value."
            />

            {isLoading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-10 flex items-center justify-center gap-3 text-muted-foreground">
                <LoadingSpinner size="sm" />
                <span>Loading your invite dashboard...</span>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/30 bg-card p-6 space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <Icon name="triangle-exclamation" />
                  <span className="font-medium">We could not load invites yet</span>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  Refresh and try again. If this keeps happening, continue from the main app and come back.
                </p>
              </div>
            ) : !dashboard ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-body-sm text-muted-foreground">
                No invite data yet.
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <p className="text-title-lg">Share your invite</p>
                        <p className="text-body-sm text-muted-foreground max-w-xl">
                          Link and code both work. Activated invites count after someone completes their profile and follows a creator on Desperse.
                        </p>
                      </div>
                      <Badge variant={shareActionsLocked ? 'warning' : 'outline'}>
                        {dashboard.remainingSlots} of {dashboard.totalSlots} invite slots available
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-label-xs text-muted-foreground uppercase tracking-[0.12em]">Invite link</p>
                        <div className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm break-all">
                          {inviteLink}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-label-xs text-muted-foreground uppercase tracking-[0.12em]">Invite code</p>
                          <Badge variant={dashboard.activatedCount >= 3 ? 'success' : 'secondary'} size="sm">
                            {dashboard.activatedCount >= 3 ? 'Custom code unlocked' : 'Default code only'}
                          </Badge>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background px-4 py-3 flex items-center justify-between gap-3">
                          <span className="text-title-lg">{dashboard.inviteCode}</span>
                          <Icon name="at" variant="regular" className="text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Button onClick={() => copyText(inviteLink, 'Invite link copied')} disabled={shareActionsLocked} className="gap-2">
                        <Icon name="link-simple" variant="regular" />
                        Copy link
                      </Button>
                      <Button onClick={() => copyText(dashboard.inviteCode, 'Invite code copied')} disabled={shareActionsLocked} variant="outline" className="gap-2">
                        <Icon name="at" variant="regular" />
                        Copy code
                      </Button>
                      <Button onClick={() => openShareSurface('qr')} disabled={shareActionsLocked} variant="outline" className="gap-2">
                        <Icon name="image" variant="regular" />
                        Show QR
                      </Button>
                      <Button onClick={() => openShareSurface('card')} disabled={shareActionsLocked} variant="outline" className="gap-2">
                        <Icon name="share-nodes" variant="regular" />
                        Share card
                      </Button>
                    </div>

                    {shareActionsLocked ? (
                      <p className="text-body-sm text-muted-foreground">
                        New share actions are locked right now. Capacity returns as pending invites activate, expire, or are removed after review.
                      </p>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-5">
                    <div className="space-y-1">
                      <p className="text-title-lg">Progress</p>
                      <p className="text-body-sm text-muted-foreground">Activated invites are the metric that matters. Pending is visible, but secondary.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricCard label="Activated invites" value={dashboard.activatedCount} tone="primary" />
                      <MetricCard label="Pending invites" value={dashboard.pendingCount} tone="muted" />
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-label-xs text-muted-foreground uppercase tracking-[0.12em]">Current tier</p>
                          <p className="text-title-lg mt-1">{currentTier}</p>
                        </div>
                        <Badge variant="outline">{dashboard.activatedCount} activated</Badge>
                      </div>

                      {nextMilestone ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">Next unlock</span>
                              <span>{nextMilestone.label} at {nextMilestone.target}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, (dashboard.activatedCount / nextMilestone.target) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-body-sm text-muted-foreground">
                            {Math.max(0, nextMilestone.target - dashboard.activatedCount)} more activated invite{nextMilestone.target - dashboard.activatedCount === 1 ? '' : 's'} to unlock {nextMilestone.label.toLowerCase()}.
                          </p>
                        </>
                      ) : (
                        <p className="text-body-sm text-muted-foreground">
                          You’ve cleared the current MVP milestones. Top Connectors eligibility is already unlocked.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-title-lg">Referral list</p>
                      <p className="text-body-sm text-muted-foreground">
                        Pending, activated, and removed states stay private here. Public surfaces only show status you have earned.
                      </p>
                    </div>
                  </div>

                  {dashboard.referrals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background px-6 py-12 text-center">
                      <p className="text-title-lg">Invite your first people into Desperse</p>
                      <p className="text-body-sm text-muted-foreground mt-2 max-w-md mx-auto">
                        Share your invite link. Referrals count after someone joins, completes their profile, and follows a creator.
                      </p>
                      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button onClick={() => copyText(inviteLink, 'Invite link copied')} disabled={shareActionsLocked}>Copy invite link</Button>
                        <Button onClick={() => openShareSurface('card')} disabled={shareActionsLocked} variant="outline">Open share card</Button>
                      </div>
                      <div className="mt-5 text-caption text-muted-foreground">
                        <div>0/1 to First Signal</div>
                        <div>{dashboard.remainingSlots} invite slots available</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupedReferrals.map((group) => (
                        <div key={group.title} className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h2 className="text-title-sm">{group.title}</h2>
                            <span className="text-caption text-muted-foreground">{group.items.length}</span>
                          </div>
                          <div className="space-y-3">
                            {group.items.map((referral) => {
                              const listState = getReferralListState(referral.state)
                              const label = getReferralStateLabel(listState)
                              const supportingCopy = getReferralStateDescription(listState)
                              const timestamp = referral.activatedAt || referral.expiredAt || referral.revokedAt || referral.rejectedAt || referral.createdAt
                              return (
                                <div key={referral.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3 min-w-0">
                                    {referral.avatarUrl ? (
                                      <img src={referral.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover border border-border/60" />
                                    ) : (
                                      <div className="h-11 w-11 rounded-full border border-border/60 bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                        <Icon name="user" variant="regular" />
                                      </div>
                                    )}
                                    <div className="min-w-0 space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium truncate">{referral.displayName || `@${referral.usernameSlug}`}</span>
                                        <span className="text-sm text-muted-foreground truncate">@{referral.usernameSlug}</span>
                                      </div>
                                      <p className="text-body-sm text-muted-foreground">{supportingCopy}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 items-start sm:items-end shrink-0">
                                    <Badge variant={getReferralStateBadgeVariant(listState)}>{label}</Badge>
                                    <span className="text-caption text-muted-foreground">{formatRelativeTime(timestamp)}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-4">
                  <div>
                    <p className="text-title-lg">Rules and FAQ</p>
                    <p className="text-body-sm text-muted-foreground">Keep the language boring and clear. This is recognition, not a rewards program.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FaqItem
                      title="What counts as activated?"
                      body="An invite counts after the person joins, completes their profile, and follows a creator on Desperse. Signup alone does not count."
                    />
                    <FaqItem
                      title="Why is something still pending?"
                      body="Pending means the person joined from your invite but has not finished the activation steps yet."
                    />
                    <FaqItem
                      title="Can progress be removed?"
                      body="Yes. Spam, self-referrals, abuse, or review corrections can remove referral credit and any threshold-based status tied to it."
                    />
                    <FaqItem
                      title="Any financial value?"
                      body="Referral progress, badges, and status are recognition only. They have no cash value and are not transferable, sellable, redeemable, or exchangeable."
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </div>

      {dashboard ? (
        <ShareSurface
          isMobile={isMobile}
          mode={shareMode}
          open={shareOpen}
          onOpenChange={setShareOpen}
          ownerName={dashboard.owner.displayName}
          inviteCode={dashboard.inviteCode}
          inviteLink={inviteLink}
          qrCodeUrl={qrCodeUrl}
          shareCopy={shareCopy}
          badgeLabel={currentTier}
          onCopyCode={() => copyText(dashboard.inviteCode, 'Invite code copied')}
          onCopyLink={() => copyText(inviteLink, 'Invite link copied')}
          onCopySuggested={() => copyText(shareCopy, 'Suggested share copy copied')}
          onNativeShare={nativeShare}
          onDownload={downloadShareCard}
        />
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'muted' }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-1">
      <p className="text-label-xs text-muted-foreground uppercase tracking-[0.12em]">{label}</p>
      <p className={tone === 'primary' ? 'text-display-sm text-foreground' : 'text-display-sm text-muted-foreground'}>{value}</p>
    </div>
  )
}

function FaqItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-body-sm text-muted-foreground">{body}</p>
    </div>
  )
}

function ShareSurface(props: {
  isMobile: boolean
  mode: ShareSurfaceMode
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerName: string
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  shareCopy: string
  badgeLabel: string
  onCopyCode: () => void
  onCopyLink: () => void
  onCopySuggested: () => void
  onNativeShare: () => void
  onDownload: () => void
}) {
  const content = (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-title-sm">Preview</p>
            <p className="text-body-sm text-muted-foreground">{props.mode === 'qr' ? 'QR first, plus link and code.' : 'Share card preview with deterministic export.'}</p>
          </div>
          <Badge variant="outline">{props.badgeLabel}</Badge>
        </div>
        <div className="rounded-[24px] border border-border/60 bg-zinc-950 text-zinc-50 p-5 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold">{props.ownerName}</p>
              <p className="text-sm text-zinc-300">Join me on Desperse</p>
            </div>
            <Badge variant="secondary">{props.badgeLabel}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_168px] items-start">
            <div className="space-y-3 min-w-0">
              <div>
                <p className="text-caption text-zinc-400">Invite code</p>
                <p className="text-2xl font-semibold">{props.inviteCode}</p>
              </div>
              <div>
                <p className="text-caption text-zinc-400">Invite link</p>
                <p className="text-sm break-all text-zinc-200">{props.inviteLink}</p>
              </div>
              <p className="text-sm text-zinc-300">Publish, discover, and collect creative work.</p>
            </div>
            <div className="rounded-2xl bg-white p-3 w-[168px] mx-auto md:mx-0">
              <img src={props.qrCodeUrl} alt="Invite QR code" className="w-full h-auto rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Invite link</p>
          <Input value={props.inviteLink} readOnly />
          <div className="flex gap-2">
            <Button onClick={props.onCopyLink} variant="outline" className="gap-2 flex-1">
              <Icon name="link-simple" variant="regular" />
              Copy link
            </Button>
            <Button onClick={props.onCopyCode} variant="outline" className="gap-2 flex-1">
              <Icon name="at" variant="regular" />
              Copy code
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggested share copy</p>
          <div className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground min-h-[104px]">
            {props.shareCopy}
          </div>
          <div className="flex gap-2">
            <Button onClick={props.onCopySuggested} variant="outline" className="gap-2 flex-1">
              <Icon name="message" variant="regular" />
              Copy copy
            </Button>
            <Button onClick={props.onNativeShare} className="gap-2 flex-1">
              <Icon name="share-nodes" variant="regular" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">QR and share card actions</p>
            <p className="text-body-sm text-muted-foreground">The exported share card uses the same deterministic card layout every time.</p>
          </div>
          <Button onClick={props.onDownload} variant="outline" className="gap-2">
            <Icon name="download" variant="regular" />
            Download card
          </Button>
        </div>
      </div>
    </div>
  )

  if (props.isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{props.mode === 'qr' ? 'Show QR' : 'Share card'}</SheetTitle>
            <SheetDescription>
              Link, code, QR, and share card actions stay in one place.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.mode === 'qr' ? 'Show QR' : 'Share card'}</DialogTitle>
          <DialogDescription>
            Link, code, QR, and share card actions stay in one clear surface.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
