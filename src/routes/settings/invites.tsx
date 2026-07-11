import { createFileRoute, Link } from '@tanstack/react-router'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Note, Progress } from '@cdecaire/sable'
import { Row, Stack } from '@cdecaire/sable/layout'

import { AuthGuard } from '@/components/shared/AuthGuard'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
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
  INVITE_CARD_BG,
  INVITE_QR_FG,
  getCurrentReferralTierLabel,
  getNextReferralMilestone,
  getReferralListState,
  getReferralStateBadgeVariant,
  getReferralStateLabel,
} from '@/lib/referrals'

export const Route = createFileRoute('/settings/invites')({
  component: InvitesPage,
})

type ReferralOwnerDashboard = NonNullable<ReturnType<typeof useReferralOwnerDashboard>['data']>
type ReferralListItem = ReferralOwnerDashboard['referrals'][number]

// A downloaded SVG can't resolve remote <image href> URLs, so every referenced
// image must be inlined as a base64 data URI to make the file self-contained.
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function InvitesPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="moderator" deniedMessage="Invites aren’t available yet.">
        <InvitesPageContent />
      </RoleGuard>
    </AuthGuard>
  )
}

function InvitesPageContent() {
  const { data: dashboard, isLoading, error } = useReferralOwnerDashboard()
  const [shareOpen, setShareOpen] = useState(false)
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
  const qrCodeUrl = inviteLink ? buildReferralQrCodeUrl(inviteLink, 280, { color: INVITE_QR_FG, bgColor: INVITE_CARD_BG }) : ''
  const shareCopy = inviteLink ? buildReferralShareCopy(inviteLink) : ''
  const nextMilestone = dashboard ? getNextReferralMilestone(dashboard.activatedCount) : null
  const currentTier = dashboard ? getCurrentReferralTierLabel(dashboard.activatedCount) : 'Invite in progress'
  const pendingLimitReached = Boolean(dashboard && dashboard.remainingSlots <= 0)

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

  const openShareSurface = () => {
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

  const downloadShareCard = async () => {
    if (!dashboard) return
    try {
      // Inline the QR (required) and avatar (best-effort) so the exported SVG
      // renders standalone. Themed to the export panel so the QR sits on the card.
      const [qrDataUri, avatarDataUri] = await Promise.all([
        fetchImageAsDataUri(buildReferralQrCodeUrl(inviteLink, 512, { color: INVITE_QR_FG, bgColor: '111113' })),
        dashboard.owner.avatarUrl ? fetchImageAsDataUri(dashboard.owner.avatarUrl) : Promise.resolve(null),
      ])

      if (!qrDataUri) {
        toast.error('Could not build the share card right now.')
        return
      }

      const svg = buildReferralShareCardSvg({
        displayName: dashboard.owner.displayName,
        handle: dashboard.owner.usernameSlug,
        bio: dashboard.owner.bio,
        avatarUrl: avatarDataUri,
        inviteCode: dashboard.inviteCode,
        inviteLink,
        qrCodeUrl: qrDataUri,
        badgeLabel: dashboard.activatedCount > 0 ? currentTier : null,
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
    <SettingsLayout nav={<SettingsNav variant="desktop" />}>
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-(--z-nav) w-full border-b bg-background"
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

      <section className="pt-settings-header md:pt-0">
        <Stack gap={2.5} className="pt-4 pb-12">
            <PageHeader
              title="Invites"
              description="Bring real people into Desperse and track which invites actually activate. Recognition only. No cash value."
            />

            {isLoading ? (
              <SettingsCard>
                <Row gap={1.5} align="center" justify="center" className="py-6 text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  <span className="text-body-sm">Loading your invites…</span>
                </Row>
              </SettingsCard>
            ) : error ? (
              <Note variant="error">
                We couldn’t load your invites. Refresh and try again.
              </Note>
            ) : !dashboard ? (
              <Note>No invite data yet.</Note>
            ) : (
              <Stack gap={2.5}>
                {/* Your invite */}
                <SettingsCard>
                  <SectionHeader icon="paper-plane" title="Your invite" />
                  <Stack gap={2}>
                    <Stack gap={0.75}>
                      <span className="text-body-sm text-muted-foreground">Invite link</span>
                      <Input value={inviteLink} readOnly aria-label="Invite link" className="font-mono text-sm" />
                    </Stack>

                    <Row gap={1.5} className="flex-col sm:flex-row">
                      <Button onClick={() => copyText(inviteLink, 'Invite link copied')} className="gap-2 flex-1">
                        <Icon name="link-simple" variant="regular" />
                        Copy link
                      </Button>
                      <Button onClick={openShareSurface} variant="outline" className="gap-2 flex-1">
                        <Icon name="share-nodes" variant="regular" />
                        Share…
                      </Button>
                    </Row>

                    <p className="text-body-sm text-muted-foreground">
                      Your code is{' '}
                      <button
                        type="button"
                        onClick={() => copyText(dashboard.inviteCode, 'Invite code copied')}
                        className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground transition-colors"
                      >
                        {dashboard.inviteCode}
                      </button>
                      . Link and code both work — invites are unlimited.
                    </p>

                    {pendingLimitReached ? (
                      <Note variant="warning">
                        You’ve reached the limit of {dashboard.totalSlots} invites waiting to activate at once. As they activate or expire, you can send more.
                      </Note>
                    ) : null}
                  </Stack>
                </SettingsCard>

                {/* Progress */}
                <SettingsCard>
                  <SectionHeader
                    icon="arrow-up-right"
                    title="Progress"
                    aside={<span className="text-body-sm text-muted-foreground">{currentTier}</span>}
                  />
                  <Stack gap={2.5}>
                    <Row gap={6} align="baseline">
                      <Stack gap={0}>
                        <span className="text-heading-1 text-foreground">{dashboard.activatedCount}</span>
                        <span className="text-body-sm text-muted-foreground">Activated</span>
                      </Stack>
                      <Stack gap={0}>
                        <span className="text-heading-1 text-muted-foreground">{dashboard.pendingCount}</span>
                        <span className="text-body-sm text-muted-foreground">Pending</span>
                      </Stack>
                    </Row>

                    {nextMilestone ? (
                      <Stack gap={1}>
                        <Row justify="between" align="center">
                          <span className="text-body-sm text-muted-foreground">Next: {nextMilestone.label}</span>
                          <span className="text-body-sm text-muted-foreground">{dashboard.activatedCount}/{nextMilestone.target}</span>
                        </Row>
                        <Progress
                          value={Math.min(100, (dashboard.activatedCount / nextMilestone.target) * 100)}
                          aria-label={`Progress toward ${nextMilestone.label}`}
                        />
                        <span className="text-body-sm text-muted-foreground">
                          {Math.max(0, nextMilestone.target - dashboard.activatedCount)} more activated invite{nextMilestone.target - dashboard.activatedCount === 1 ? '' : 's'} to unlock {nextMilestone.label.toLowerCase()}.
                        </span>
                      </Stack>
                    ) : (
                      <Note variant="success">You’ve cleared every current milestone. Top Connectors eligibility is unlocked.</Note>
                    )}
                  </Stack>
                </SettingsCard>

                {/* Invited people */}
                <SettingsCard>
                  <SectionHeader
                    icon="users"
                    title="Invited people"
                    aside={dashboard.referrals.length > 0 ? <span className="text-body-sm text-muted-foreground">{dashboard.referrals.length}</span> : undefined}
                  />

                  {dashboard.referrals.length === 0 ? (
                    <Stack gap={1} align="center" className="py-8 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Icon name="user-plus" variant="regular" />
                      </div>
                      <span className="text-label-lg text-foreground">No invites yet</span>
                      <p className="text-body-sm text-muted-foreground max-w-sm">
                        Share your link to invite people in. They’ll appear here, and count once they complete their profile and follow a creator.
                      </p>
                      <Button onClick={() => copyText(inviteLink, 'Invite link copied')} className="gap-2 mt-1">
                        <Icon name="link-simple" variant="regular" />
                        Copy invite link
                      </Button>
                    </Stack>
                  ) : (
                    <Stack gap={3}>
                      {groupedReferrals.map((group) => (
                        <Stack gap={0} key={group.title}>
                          <Row justify="between" align="center" className="mb-1">
                            <span className="text-label-md text-muted-foreground">{group.title}</span>
                            <span className="text-body-sm text-muted-foreground">{group.items.length}</span>
                          </Row>
                          <div>
                            {group.items.map((referral) => {
                              const listState = getReferralListState(referral.state)
                              const label = getReferralStateLabel(listState)
                              const timestamp = referral.activatedAt || referral.expiredAt || referral.revokedAt || referral.rejectedAt || referral.createdAt
                              return (
                                <Row key={referral.id} gap={2} align="center" justify="between" className="py-3 border-b border-border/50 last:border-b-0">
                                  <Row gap={2} align="center" className="min-w-0">
                                    {referral.avatarUrl ? (
                                      <img src={referral.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                        <Icon name="user" variant="regular" />
                                      </div>
                                    )}
                                    <Stack gap={0} className="min-w-0">
                                      <span className="text-label-md truncate">{referral.displayName || `@${referral.usernameSlug}`}</span>
                                      <span className="text-body-sm text-muted-foreground truncate">@{referral.usernameSlug}</span>
                                    </Stack>
                                  </Row>
                                  <Stack gap={0.5} align="end" className="shrink-0">
                                    <Badge variant={getReferralStateBadgeVariant(listState)} size="sm">{label}</Badge>
                                    <span className="text-body-sm text-muted-foreground">{formatRelativeTime(timestamp)}</span>
                                  </Stack>
                                </Row>
                              )
                            })}
                          </div>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </SettingsCard>

                {/* How invites work */}
                <SettingsCard>
                  <SectionHeader icon="circle-question" title="How invites work" />
                  <div>
                    {INVITE_FAQ.map((faq) => (
                      <Stack gap={0.5} key={faq.q} className="py-3 border-b border-border/50 last:border-b-0">
                        <span className="text-label-md">{faq.q}</span>
                        <span className="text-body-sm text-muted-foreground">{faq.a}</span>
                      </Stack>
                    ))}
                  </div>
                </SettingsCard>
              </Stack>
            )}
        </Stack>
      </section>

      {dashboard ? (
        <ShareSurface
          isMobile={isMobile}
          open={shareOpen}
          onOpenChange={setShareOpen}
          ownerName={dashboard.owner.displayName}
          ownerHandle={dashboard.owner.usernameSlug}
          avatarUrl={dashboard.owner.avatarUrl}
          headerBgUrl={dashboard.owner.headerBgUrl}
          bio={dashboard.owner.bio}
          inviteCode={dashboard.inviteCode}
          inviteLink={inviteLink}
          qrCodeUrl={qrCodeUrl}
          shareCopy={shareCopy}
          badgeLabel={currentTier}
          showBadge={dashboard.activatedCount > 0}
          onCopyCode={() => copyText(dashboard.inviteCode, 'Invite code copied')}
          onCopyLink={() => copyText(inviteLink, 'Invite link copied')}
          onCopySuggested={() => copyText(shareCopy, 'Message copied')}
          onNativeShare={nativeShare}
          onDownload={downloadShareCard}
        />
      ) : null}
    </SettingsLayout>
  )
}

const INVITE_FAQ = [
  {
    q: 'What counts as activated?',
    a: 'An invite counts after the person joins, completes their profile, and follows a creator on Desperse. Signup alone does not count.',
  },
  {
    q: 'Why is someone still pending?',
    a: 'Pending means they joined from your invite but haven’t finished the activation steps yet.',
  },
  {
    q: 'Can progress be removed?',
    a: 'Yes. Spam, self-referrals, abuse, or review corrections can remove referral credit and any status tied to it.',
  },
  {
    q: 'Is there any financial value?',
    a: 'Progress, badges, and status are recognition only. They have no cash value and are not transferable, sellable, redeemable, or exchangeable.',
  },
] as const

// Desperse settings card — matches the shell used across /settings/account/*.
function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-5 md:py-6">
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, aside }: { icon: string; title: string; aside?: ReactNode }) {
  return (
    <Row gap={1.5} align="center" justify="between" className="mb-4">
      <Row gap={1.5} align="center">
        <Icon name={icon} variant="regular" className="w-5 text-center text-muted-foreground" />
        <span className="text-label-lg">{title}</span>
      </Row>
      {aside}
    </Row>
  )
}

type ShareSurfaceProps = {
  isMobile: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerName: string
  ownerHandle: string
  avatarUrl: string | null
  headerBgUrl: string | null
  bio: string | null
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  shareCopy: string
  badgeLabel: string
  showBadge: boolean
  onCopyCode: () => void
  onCopyLink: () => void
  onCopySuggested: () => void
  onNativeShare: () => void
  onDownload: () => void
}

// The recipient-facing invite card: the inviter's profile (header, avatar, bio)
// paired with their code and a scannable QR. This is what someone actually sees.
function InviteCard(props: ShareSurfaceProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-zinc-950 text-zinc-50 select-none">
      <div className="relative h-24">
        {props.headerBgUrl ? (
          <img src={props.headerBgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--tone-edition-dark)]/50 via-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        {props.showBadge ? (
          <span className="absolute top-3 right-3 rounded-full bg-zinc-950/70 backdrop-blur px-2.5 py-1 text-xs font-medium text-zinc-100">
            {props.badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="relative z-10 px-5 -mt-9">
        {props.avatarUrl ? (
          <img src={props.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-zinc-950 bg-zinc-800" />
        ) : (
          <div className="h-16 w-16 rounded-full ring-4 ring-zinc-950 bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Icon name="user" variant="regular" />
          </div>
        )}
        <p className="mt-2.5 text-lg font-semibold leading-tight">{props.ownerName}</p>
        <p className="text-sm text-zinc-400">@{props.ownerHandle}</p>
        {props.bio ? <p className="mt-2 text-sm text-zinc-300 line-clamp-2">{props.bio}</p> : null}
      </div>

      <div className="mt-4 px-5 py-4 border-t border-white/10">
        <p className="text-xs text-zinc-500 mb-3">Join me on Desperse</p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-xs text-zinc-500">Invite code</p>
              <p className="text-xl font-semibold leading-tight">{props.inviteCode}</p>
            </div>
            <p className="text-xs text-zinc-400 break-all">{props.inviteLink}</p>
          </div>
          <img src={props.qrCodeUrl} alt="Invite QR code" className="w-24 h-24 block shrink-0" />
        </div>
      </div>
    </div>
  )
}

function ShareSurface(props: ShareSurfaceProps) {
  const content = (
    <Stack gap={2.5}>
      <Stack gap={1}>
        <span className="text-body-sm text-muted-foreground">Preview</span>
        <InviteCard {...props} />
      </Stack>

      <div className="grid gap-4 md:grid-cols-2">
        <Stack gap={1}>
          <span className="text-label-md">Invite link</span>
          <Input value={props.inviteLink} readOnly aria-label="Invite link" className="font-mono text-sm" />
          <Row gap={1.5}>
            <Button onClick={props.onCopyLink} variant="outline" className="gap-2 flex-1">
              <Icon name="link-simple" variant="regular" />
              Copy link
            </Button>
            <Button onClick={props.onCopyCode} variant="outline" className="gap-2 flex-1">
              <Icon name="at" variant="regular" />
              Copy code
            </Button>
          </Row>
        </Stack>
        <Stack gap={1}>
          <span className="text-label-md">Suggested message</span>
          <div className="rounded-lg border border-input bg-muted/30 px-3.5 py-3 text-sm text-muted-foreground min-h-[92px]">
            {props.shareCopy}
          </div>
          <Row gap={1.5}>
            <Button onClick={props.onCopySuggested} variant="outline" className="gap-2 flex-1">
              <Icon name="message" variant="regular" />
              Copy message
            </Button>
            <Button onClick={props.onNativeShare} className="gap-2 flex-1">
              <Icon name="share-nodes" variant="regular" />
              Share
            </Button>
          </Row>
        </Stack>
      </div>

      <Row justify="between" align="center" gap={3} className="rounded-lg border border-input bg-muted/20 px-4 py-3">
        <span className="text-body-sm text-muted-foreground">Download a shareable image of your invite card.</span>
        <Button onClick={props.onDownload} variant="outline" className="gap-2 shrink-0">
          <Icon name="download" variant="regular" />
          Download
        </Button>
      </Row>
    </Stack>
  )

  if (props.isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Share your invite</SheetTitle>
            <SheetDescription>
              Send your personal invite card, link, or QR code.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share your invite</DialogTitle>
          <DialogDescription>
            Send your personal invite card, link, or QR code.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
