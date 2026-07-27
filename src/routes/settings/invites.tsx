import { createFileRoute, Link } from '@tanstack/react-router'
import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { useReferralLeaderboard, useReferralOwnerDashboard, useUpdateCustomInviteCode } from '@/hooks/useReferrals'
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
  const { data: leaderboard } = useReferralLeaderboard()
  const updateCustomCode = useUpdateCustomInviteCode()
  const [customCode, setCustomCode] = useState('')
  const [customCodeFeedback, setCustomCodeFeedback] = useState<string | null>(null)

  const origin = typeof window === 'undefined' ? 'https://desperse.com' : window.location.origin
  const inviteLink = dashboard ? buildInviteLink(origin, dashboard.inviteCode) : ''
  const qrCodeUrl = inviteLink ? buildReferralQrCodeUrl(inviteLink, 280, { color: INVITE_QR_FG, bgColor: INVITE_CARD_BG }) : ''
  const shareCopy = inviteLink ? buildReferralShareCopy(inviteLink) : ''
  const nextMilestone = dashboard ? getNextReferralMilestone(dashboard.activatedCount) : null
  const currentTier = dashboard ? getCurrentReferralTierLabel(dashboard.activatedCount) : 'Invite in progress'
  const pendingLimitReached = Boolean(dashboard && dashboard.remainingSlots <= 0)

  const submitCustomCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await updateCustomCode.mutateAsync(customCode)
    if (!result.success) {
      setCustomCodeFeedback(result.error || 'Could not update your invite code.')
      return
    }

    setCustomCode('')
    setCustomCodeFeedback(`Your invite code is now ${result.code}.`)
    toast.success('Custom invite code updated')
  }

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
              description="Bring real people into Desperse and track which invites actually activate."
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
                {/* The invite card itself — click for quick actions. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Invite card — open quick actions"
                      className="block w-full text-left rounded-2xl cursor-pointer ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <InviteCard
                        ownerName={dashboard.owner.displayName}
                        ownerHandle={dashboard.owner.usernameSlug}
                        avatarUrl={dashboard.owner.avatarUrl}
                        headerBgUrl={dashboard.owner.headerBgUrl}
                        bio={dashboard.owner.bio}
                        inviteCode={dashboard.inviteCode}
                        inviteLink={inviteLink}
                        qrCodeUrl={qrCodeUrl}
                        badgeLabel={currentTier}
                        showBadge={dashboard.activatedCount > 0}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[12rem]">
                    <DropdownMenuItem onClick={nativeShare} className="gap-2.5">
                      <Icon name="share-nodes" variant="regular" className="w-4 text-center text-muted-foreground" />
                      Share invite
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => copyText(inviteLink, 'Invite link copied')} className="gap-2.5">
                      <Icon name="link-simple" variant="regular" className="w-4 text-center text-muted-foreground" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyText(dashboard.inviteCode, 'Invite code copied')}
                      className="gap-2.5"
                    >
                      <Icon name="at" variant="regular" className="w-4 text-center text-muted-foreground" />
                      Copy code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyText(shareCopy, 'Message copied')} className="gap-2.5">
                      <Icon name="message" variant="regular" className="w-4 text-center text-muted-foreground" />
                      Copy message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={downloadShareCard} className="gap-2.5">
                      <Icon name="download" variant="regular" className="w-4 text-center text-muted-foreground" />
                      Download image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Your invite */}
                <SettingsCard>
                  <SectionHeader title="Your invite" />
                  <Stack gap={2}>
                    <Stack gap={0.75}>
                      <span className="text-body-sm text-muted-foreground">Invite link</span>
                      <div className="relative">
                        <Input
                          value={inviteLink}
                          readOnly
                          aria-label="Invite link"
                          className="font-mono text-sm h-12 pr-24"
                        />
                        <Button
                          onClick={() => copyText(inviteLink, 'Invite link copied')}
                          variant="secondary"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 md:h-9 px-3"
                        >
                          Copy
                        </Button>
                      </div>
                    </Stack>

                    <Button onClick={nativeShare} className="w-full h-12">
                      Share invite
                    </Button>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => copyText(dashboard.inviteCode, 'Invite code copied')}
                        variant="outline"
                        className="h-10 md:h-10 px-2"
                      >
                        Copy code
                      </Button>
                      <Button onClick={() => copyText(shareCopy, 'Message copied')} variant="outline" className="h-10 md:h-10 px-2">
                        Copy message
                      </Button>
                      <Button onClick={downloadShareCard} variant="outline" className="h-10 md:h-10 px-2">
                        Download
                      </Button>
                    </div>

                    <p className="text-body-sm text-muted-foreground">
                      Link and code both work — invites are unlimited.
                    </p>

                    {pendingLimitReached ? (
                      <Note variant="warning">
                        You’ve reached the limit of {dashboard.totalSlots} invites waiting to activate at once. As they activate or expire, you can send more.
                      </Note>
                    ) : null}
                  </Stack>
                </SettingsCard>

                {/* Custom invite code */}
                <SettingsCard>
                  <SectionHeader title="Custom invite code" />
                  {dashboard.customCodeUnlocked ? (
                    <form onSubmit={submitCustomCode}>
                      <Stack gap={1.5}>
                        <p className="text-body-sm text-muted-foreground">
                          Choose 3–20 letters, numbers, or underscores. Availability is checked when you submit, and codes can be changed once every 7 days.
                        </p>
                        <Row gap={1.5} className="flex-col sm:flex-row">
                          <Input
                            value={customCode}
                            onChange={(event) => {
                              setCustomCode(event.target.value.toLowerCase().replace(/^@+/, ''))
                              setCustomCodeFeedback(null)
                            }}
                            placeholder={dashboard.customInviteCode || dashboard.defaultInviteCode}
                            aria-label="Custom invite code"
                            aria-describedby="custom-invite-code-feedback"
                            pattern="[a-z0-9_]{3,20}"
                            minLength={3}
                            maxLength={20}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="font-mono"
                            required
                          />
                          <Button type="submit" disabled={updateCustomCode.isPending} className="shrink-0">
                            {updateCustomCode.isPending ? 'Checking…' : dashboard.customInviteCode ? 'Change code' : 'Claim code'}
                          </Button>
                        </Row>
                        <p
                          id="custom-invite-code-feedback"
                          className="text-body-sm text-muted-foreground"
                          aria-live="polite"
                        >
                          {customCodeFeedback
                            || (dashboard.customInviteCode
                              ? `Current custom code: ${dashboard.customInviteCode}`
                              : 'Reserved or unavailable codes will show alternatives.')}
                        </p>
                      </Stack>
                    </form>
                  ) : (
                    <Note>Unlock a custom code after 3 activated invites. You have {dashboard.activatedCount}.</Note>
                  )}
                </SettingsCard>

                {/* Progress */}
                <SettingsCard>
                  <SectionHeader
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
                      <Note variant="success">You’ve cleared every current milestone. Referral board eligibility is unlocked.</Note>
                    )}
                  </Stack>
                </SettingsCard>

                {/* Invited people */}
                <SettingsCard>
                  <SectionHeader
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
                      <Button onClick={() => copyText(inviteLink, 'Invite link copied')} className="mt-1">
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

                {/* Referral board preview */}
                <SettingsCard>
                  <SectionHeader
                    title="Referral board"
                    aside={<Badge variant="secondary" size="sm">This week</Badge>}
                  />
                  <Stack gap={2}>
                    {leaderboard?.currentUserStatus?.state === 'ranked' ? (
                      <div>
                        <p className="text-title-lg">You’re #{leaderboard.currentUserStatus.rank} this week</p>
                        <p className="mt-1 text-body-sm text-muted-foreground">Ranked by valid invites activated since Monday.</p>
                      </div>
                    ) : leaderboard?.currentUserStatus?.state === 'awaiting' ? (
                      <div>
                        <p className="text-title-lg">You’re eligible for this week’s board</p>
                        <p className="mt-1 text-body-sm text-muted-foreground">Rankings may be reviewed before publication.</p>
                      </div>
                    ) : leaderboard?.currentUserStatus?.state === 'review-held' ? (
                      <div>
                        <p className="text-title-lg">Leaderboard status under review</p>
                        <p className="mt-1 text-body-sm text-muted-foreground">Your profile credit remains visible while board placement is reviewed.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-title-lg">Activate 10 invites to qualify</p>
                        <p className="mt-1 text-body-sm text-muted-foreground">
                          {leaderboard?.currentUserStatus?.state === 'ineligible'
                            ? `${leaderboard.currentUserStatus.remainingToQualify} more valid activation${leaderboard.currentUserStatus.remainingToQualify === 1 ? '' : 's'} to reach the referral board.`
                            : 'The referral board highlights members bringing active people into Desperse.'}
                        </p>
                      </div>
                    )}
                    <Button asChild variant="outline" className="w-full md:w-fit">
                      <Link to="/leaderboard" search={{ view: 'referrals' }}>View leaderboard</Link>
                    </Button>
                  </Stack>
                </SettingsCard>

                {/* How invites work */}
                <SettingsCard>
                  <SectionHeader title="How invites work" />
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
] as const

// Desperse settings card — matches the shell used across /settings/account/*.
function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-5 md:py-6">
      {children}
    </div>
  )
}

function SectionHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <Row gap={1.5} align="center" justify="between" className="mb-4">
      <span className="text-label-lg">{title}</span>
      {aside}
    </Row>
  )
}

type InviteCardProps = {
  ownerName: string
  ownerHandle: string
  avatarUrl: string | null
  headerBgUrl: string | null
  bio: string | null
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  badgeLabel: string
  showBadge: boolean
}

// The recipient-facing invite card: the inviter's profile (header, avatar, bio)
// paired with their code and a scannable QR. This is what someone actually sees.
function InviteCard(props: InviteCardProps) {
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
