/**
 * About Page
 * A public narrative surface for Desperse. It borrows Sable's marketing-shell
 * structure - wide regions, one display headline, divided bands - while keeping
 * the voice focused, product-literate, and art-forward.
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { Reveal, TextReveal } from '@cdecaire/sable'
import { Region, Row, Stack } from '@cdecaire/sable/layout'
import { Footer } from '@/components/layout/Footer'
import { PublicHeader, PUBLIC_NAV_ITEMS } from '@/components/layout/PublicHeader'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { getLandingProfilePreview, getTrendingPosts } from '@/server/functions/explore'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { toGalleryPost } from '@/components/gallery/mapPost'
import { PostMedia } from '@/components/feed/PostMedia'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { detectMediaType } from '@/lib/media'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

const VALUE_PROPS = [
  'Standard posts',
  'Free collectibles',
  'Paid editions',
  'Collector downloads',
]

const AUDIENCES = [
  {
    title: 'For creators',
    body: 'Share the work first. When a piece should be collectible, offer it as a free collectible or a paid edition with price, supply, and timing controls.',
    details: ['Keep 95% of every edition sale', 'Attach downloadable files for collectors', 'Choose open, capped, or timed edition drops'],
    accent: 'Creator share',
    metric: '95%',
  },
  {
    title: 'For collectors',
    body: 'Follow creators, browse their work, and collect pieces into your own wallet. Start with email if you want, then connect a Solana wallet when you are ready.',
    details: ['Collect free pieces or buy paid editions', 'See creator and edition details before collecting', 'Use email onboarding or connect your wallet'],
    accent: 'Platform fee',
    metric: '5%',
  },
]

const WORK_MODES = [
  {
    icon: 'image' as const,
    title: 'Post',
    body: 'Share a standard post and build the profile around the work.',
  },
  {
    icon: 'gem' as const,
    title: 'Collectible',
    body: 'Let people collect a free piece into their wallet without asking them to buy.',
  },
  {
    icon: 'sparkles' as const,
    title: 'Edition',
    body: 'Sell a limited or timed edition with price, supply, and currency shown up front.',
  },
  {
    icon: 'download' as const,
    title: 'Download',
    body: 'Attach files anyone can access on posts, or reserve them for collectors on editions.',
  },
]

const HOW_IT_WORKS = [
  {
    title: 'Publish the work',
    body: 'Upload media, add a caption, and choose Standard, Collectible, or Edition.',
  },
  {
    title: 'Set the terms',
    body: 'For editions, set price, supply, currency, and mint window before buyers can collect.',
  },
  {
    title: 'Collectors approve once',
    body: 'Collectors review the details and approve one transaction. Desperse shows fees before they collect.',
  },
  {
    title: 'Ownership follows the wallet',
    body: 'The collected piece lands in the collector wallet and links back to the creator.',
  },
]

const PRINCIPLES = [
  {
    bad: 'Ads in the feed',
    good: 'Desperse does not sell ad space or resell user data. The feed exists to show work from creators people follow.',
  },
  {
    bad: 'Algorithm-first discovery',
    good: 'The home feed starts with follows. Explore helps people find new work, but it does not replace the creator relationship.',
  },
  {
    bad: 'Wallets before context',
    good: 'Visitors can start with email and connect Phantom, Solflare, or another Solana wallet when they collect.',
  },
  {
    bad: 'Hidden mint costs',
    good: 'Edition price, supply, timing, and fees are visible before anyone approves a transaction.',
  },
]

const TRUST_ITEMS = [
  {
    icon: 'rocket' as const,
    title: 'Solana',
    body: 'Fast, low-cost transactions for everyday collecting.',
  },
  {
    icon: 'cube' as const,
    title: 'Metaplex',
    body: 'NFT standards for collectibles, paid editions, metadata, and provenance on Solana.',
  },
  {
    icon: 'shield-check' as const,
    title: 'Privy',
    body: 'Email sign-in and embedded wallets so new collectors can start without giving up ownership.',
  },
]

function AboutPage() {
  const { login, ready, authenticated } = usePrivy()

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <PublicHeader navItems={PUBLIC_NAV_ITEMS} />

      <main id="main-content" className="flex-1 pt-28 md:pt-32">
        <HeroSection login={login} ready={ready} authenticated={authenticated} />
        <AudienceSection />
        <WorkModesSection />
        <LiveGallerySection />
        <HowItWorksSection />
        <PrinciplesSection />
        <TrustSection />
        <FinalCta login={login} ready={ready} authenticated={authenticated} />
      </main>

      <Footer showCta={false} fluid />
    </div>
  )
}

function HeroSection({
  login,
  ready,
  authenticated,
}: {
  login: () => void
  ready: boolean
  authenticated: boolean
}) {
  return (
    <Region as="section" max="wide" className="pb-16 pt-14 md:pb-24 md:pt-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,1.12fr)] lg:items-center">
        <Stack gap={5} className="max-w-5xl">
          <p className="text-label-md text-muted-foreground">
            For creator-owned media
          </p>

          <Stack gap={4}>
            <TextReveal
              as="h1"
              text="Desperse is where creative work becomes collectible."
              className="max-w-4xl text-balance text-heading-1 md:text-display-xl xl:text-display-2xl"
              once
            />
            <p className="max-w-[64ch] text-pretty text-body-lg text-muted-foreground">
              Publish your work, offer it as a free collectible or paid edition,
              and let collectors own it in their wallet. The social feed stays
              familiar; the collecting details stay clear.
            </p>
          </Stack>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {authenticated ? (
              <Button asChild size="cta">
                <Link to="/">Go to feed</Link>
              </Button>
            ) : (
              <Button size="cta" onClick={() => login()} disabled={!ready}>
                Start creating
              </Button>
            )}
            <Button asChild size="cta" variant="outline">
              <Link to="/explore">
                Explore the gallery
                <Icon name="arrow-right" className="ml-2 text-sm" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2" aria-label="Desperse highlights">
            {VALUE_PROPS.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border px-3 py-1 text-label-md text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </Stack>

        <LiveCreatorPreview />
      </div>
    </Region>
  )
}

function LiveCreatorPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['about-live-creator-preview'],
    queryFn: async () => getLandingProfilePreview({} as never),
    staleTime: 1000 * 60 * 10,
  })

  const creator = data?.creator
  const works = (data?.posts ?? []).slice(0, 3)

  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-lg border border-border bg-overlay p-5 text-overlay-foreground shadow-[0_8px_8px_rgba(0,0,0,0.18)] md:p-6"
        aria-label="Loading live creator profile preview"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="size-12 rounded-full bg-overlay-foreground/12 motion-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-overlay-foreground/12 motion-pulse" />
            <div className="h-3 w-28 rounded bg-overlay-foreground/12 motion-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 aspect-[16/10] rounded-lg bg-overlay-foreground/12 motion-pulse" />
          <div className="aspect-square rounded-lg bg-overlay-foreground/12 motion-pulse" />
          <div className="aspect-square rounded-lg bg-overlay-foreground/12 motion-pulse" />
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-overlay-foreground/10 border-t border-overlay-foreground/10 pt-4">
          <div className="h-9 px-3">
            <div className="mb-2 h-4 w-8 rounded bg-overlay-foreground/12 motion-pulse" />
            <div className="h-3 w-12 rounded bg-overlay-foreground/12 motion-pulse" />
          </div>
          <div className="h-9 px-3">
            <div className="mb-2 h-4 w-8 rounded bg-overlay-foreground/12 motion-pulse" />
            <div className="h-3 w-12 rounded bg-overlay-foreground/12 motion-pulse" />
          </div>
          <div className="h-9 px-3">
            <div className="mb-2 h-4 w-8 rounded bg-overlay-foreground/12 motion-pulse" />
            <div className="h-3 w-16 rounded bg-overlay-foreground/12 motion-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-overlay p-5 text-overlay-foreground shadow-[0_8px_8px_rgba(0,0,0,0.18)] md:p-6">
        <Stack gap={4}>
          <p className="text-label-md text-overlay-foreground/60">Creator profile preview</p>
          <Stack gap={2}>
            <h2 className="text-heading-3">Creator profiles appear here when work is available.</h2>
            <p className="text-body-md text-overlay-foreground/70">
              This preview uses the same creator and gallery data as the public
              homepage and Explore.
            </p>
          </Stack>
          <Button asChild variant="outline" className="w-fit border-overlay-foreground/20 text-overlay-foreground hover:bg-overlay-foreground/10">
            <Link to="/explore">Open Explore</Link>
          </Button>
        </Stack>
      </div>
    )
  }

  return (
    <aside
      className="overflow-hidden rounded-lg border border-border bg-overlay p-5 text-overlay-foreground shadow-[0_8px_8px_rgba(0,0,0,0.18)] md:p-6"
      aria-label="Live creator profile preview from Desperse"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            src={creator.avatarUrl}
            alt={creator.displayName || creator.usernameSlug}
            size="md"
            className="size-12"
          />
          <div className="min-w-0">
            <p className="truncate text-title-md">
              {creator.displayName || `@${creator.usernameSlug}`}
            </p>
            <p className="truncate text-body-sm text-overlay-foreground/65">
              @{creator.usernameSlug}
            </p>
          </div>
        </div>
        <Link
          to="/profile/$slug"
          params={{ slug: creator.usernameSlug }}
          className="shrink-0 text-label-md text-overlay-foreground/70 hover:text-overlay-foreground motion-interactive"
        >
          View profile
        </Link>
      </div>

      {works.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {works.map((post, index) => (
            <Link
              key={post.id}
              to="/post/$postId"
              params={{ postId: post.id }}
              className={`group relative overflow-hidden rounded-lg bg-overlay-foreground/8 ${
                index === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-square'
              }`}
            >
              <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 [&>div]:h-full [&>div]:w-full [&_img]:!h-full [&_img]:!max-h-none [&_img]:!w-full [&_img]:!object-cover [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover">
                <PostMedia
                  mediaUrl={post.mediaUrl}
                  coverUrl={post.coverUrl}
                  mediaType={detectMediaType(post.mediaUrl)}
                  alt={post.caption || 'Artwork on Desperse'}
                  aspectRatio={index === 0 ? 'auto' : 'square'}
                  preview
                  lazy={index > 0}
                  className="h-full w-full rounded-none! border-0! bg-transparent!"
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 divide-x divide-overlay-foreground/10 border-t border-overlay-foreground/10 pt-4">
        <LiveCreatorStat value={creator.postCount} label="Posts" />
        <LiveCreatorStat value={creator.mintCount} label="Mints" />
        <LiveCreatorStat value={creator.followerCount} label="Followers" />
      </div>
    </aside>
  )
}

function LiveCreatorStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-3 py-2">
      <p className="text-title-sm">{value}</p>
      <p className="text-label-xs text-overlay-foreground/60">{label}</p>
    </div>
  )
}

function AudienceSection() {
  return (
    <section id="platform" className="border-y border-border bg-muted/35 scroll-mt-8">
      <Region max="wide" className="py-14">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <Stack gap={3}>
            <p className="text-label-md text-muted-foreground">
              Creators and collectors
            </p>
            <h2 className="max-w-xl text-heading-1">Built for both sides of the work.</h2>
            <p className="max-w-[58ch] text-body-lg text-muted-foreground">
              Creators need room to publish without turning every post into a
              sale. Collectors need context before they collect. Desperse keeps
              both paths connected.
            </p>
          </Stack>

          <Reveal>
            <div className="grid overflow-hidden rounded-lg border border-border bg-card max-md:divide-y md:grid-cols-2 md:divide-x divide-border">
              {AUDIENCES.map((audience) => (
                <Stack key={audience.title} gap={4} className="p-5 md:p-6">
                  <Stack gap={3}>
                    <h3 className="text-heading-2">{audience.title}</h3>
                    <p className="text-body-md text-muted-foreground">{audience.body}</p>
                  </Stack>

                  <ul className="space-y-3">
                    {audience.details.map((detail) => (
                      <li key={detail} className="flex gap-3 text-body-sm text-muted-foreground">
                        <Icon name="check" className="mt-1 text-xs text-foreground" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-border pt-5">
                    <p className="text-display-lg">{audience.metric}</p>
                    <p className="text-label-md text-muted-foreground">{audience.accent}</p>
                  </div>
                </Stack>
              ))}
            </div>
          </Reveal>
        </div>
      </Region>
    </section>
  )
}

function WorkModesSection() {
  return (
    <section id="publishing" className="border-t border-border scroll-mt-8">
      <Region max="wide" className="py-14 md:py-16">
        <Stack gap={8}>
          <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
            <h2 className="max-w-2xl text-heading-1">Choose the format before you publish.</h2>
            <p className="max-w-[62ch] text-body-lg text-muted-foreground lg:justify-self-end">
              Start with a standard post, make a piece free to collect, sell a
              paid edition, or attach downloadable files. Each option lives in
              the same publishing flow.
            </p>
          </div>

          <Reveal>
            <div className="grid overflow-hidden rounded-lg border border-border bg-card max-md:divide-y md:grid-cols-2 lg:grid-cols-4 md:divide-x divide-border">
              {WORK_MODES.map((mode) => (
                <Stack key={mode.title} gap={3} className="p-5 md:p-6">
                  <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-foreground">
                    <Icon name={mode.icon} variant="regular" className="text-base" />
                  </span>
                  <Stack gap={1}>
                    <h3 className="text-title-lg">{mode.title}</h3>
                    <p className="text-body-sm text-muted-foreground">{mode.body}</p>
                  </Stack>
                </Stack>
              ))}
            </div>
          </Reveal>
        </Stack>
      </Region>
    </section>
  )
}

function LiveGallerySection() {
  const { data, isLoading } = useQuery({
    queryKey: ['about-gallery-preview'],
    queryFn: async () => {
      const result = await getTrendingPosts({
        data: { limit: 8, offset: 0 },
      } as never)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch gallery preview')
      }
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const posts = (data?.posts ?? []).map(toGalleryPost).slice(0, 4)

  if (!isLoading && posts.length === 0) return null

  return (
    <section id="gallery" className="border-t border-border bg-muted/35 scroll-mt-8">
      <Region max="full" className="py-16 md:py-24">
        <Stack gap={8}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <Stack gap={2}>
              <h2 className="max-w-2xl text-heading-1">See real work from Explore.</h2>
              <p className="max-w-[62ch] text-body-lg text-muted-foreground">
                This section uses live Explore posts, so the About page reflects
                what visitors can browse today.
              </p>
            </Stack>
            <Link
              to="/explore"
              search={{ tab: 'trending' }}
              className="shrink-0 text-label-lg text-muted-foreground hover:text-foreground motion-interactive"
            >
              Open Explore <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <GalleryGrid
            posts={posts}
            isLoading={isLoading}
            skeletonCount={4}
            eagerCount={2}
            className="xl:grid-cols-4 2xl:grid-cols-4"
          />
        </Stack>
      </Region>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="border-t border-border">
      <Region max="wide" className="py-14 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.5fr_1fr]">
          <Stack gap={3}>
            <h2 className="text-heading-1">From post to collected piece.</h2>
            <p className="max-w-[54ch] text-body-lg text-muted-foreground">
              Blockchain steps stay behind familiar publishing and collecting
              actions until the details matter.
            </p>
          </Stack>

          <div className="grid gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-border bg-card p-5">
                <p className="text-mono-sm text-muted-foreground">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-4 text-title-lg">{step.title}</h3>
                <p className="mt-2 text-body-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Region>
    </section>
  )
}

function PrinciplesSection() {
  return (
    <section className="border-t border-border bg-muted/35">
      <Region max="wide" className="py-16 md:py-24">
        <Stack gap={8}>
          <div className="grid gap-4 lg:grid-cols-[0.62fr_1fr] lg:items-end">
            <h2 className="max-w-2xl text-heading-1">Designed around the work, not the feed.</h2>
            <p className="max-w-[62ch] text-body-lg text-muted-foreground lg:justify-self-end">
              Desperse keeps social discovery useful without making engagement
              the product. Ownership, attribution, and payment are visible when
              they matter.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            {PRINCIPLES.map((principle, index) => (
              <div
                key={principle.bad}
                className={`grid gap-0 md:grid-cols-[0.34fr_1fr] ${
                  index < PRINCIPLES.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3 border-border px-5 py-4 md:border-r">
                  <Icon name="xmark" className="text-sm text-destructive" />
                  <span className="text-label-lg">{principle.bad}</span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-body-md text-muted-foreground">{principle.good}</p>
                </div>
              </div>
            ))}
          </div>
        </Stack>
      </Region>
    </section>
  )
}

function TrustSection() {
  return (
    <section id="trust" className="border-t border-border scroll-mt-8">
      <Region max="wide" className="py-16 md:py-24">
        <Stack gap={8}>
          <div className="grid gap-4 lg:grid-cols-[0.52fr_1fr] lg:items-end">
            <h2 className="text-heading-1">The stack behind the experience.</h2>
            <p className="max-w-[62ch] text-body-lg text-muted-foreground lg:justify-self-end">
              Desperse is Web3-native, but the product language stays human:
              publish, follow, collect, own. The stack is specific where trust
              matters and quiet everywhere else.
            </p>
          </div>

          <div className="grid overflow-hidden rounded-lg border border-border bg-card max-md:divide-y md:grid-cols-3 md:divide-x divide-border">
            {TRUST_ITEMS.map((item) => (
              <Stack key={item.title} gap={3} className="p-5 md:p-6">
                <Icon name={item.icon} variant="regular" className="text-lg text-muted-foreground" />
                <Stack gap={1}>
                  <h3 className="text-title-lg">{item.title}</h3>
                  <p className="text-body-sm text-muted-foreground">{item.body}</p>
                </Stack>
              </Stack>
            ))}
          </div>

          <Row gap={4} wrap className="border-t border-border pt-6">
            <Link to="/fees" className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive">
              Fees and pricing
            </Link>
            <Link to="/privacy" className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive">
              Privacy
            </Link>
          </Row>
        </Stack>
      </Region>
    </section>
  )
}

function FinalCta({
  login,
  ready,
  authenticated,
}: {
  login: () => void
  ready: boolean
  authenticated: boolean
}) {
  return (
    <section className="border-t border-border">
      <Region max="wide" className="py-16 md:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Stack gap={2}>
            <h2 className="text-heading-1">Start with one standard post.</h2>
            <p className="max-w-[58ch] text-body-lg text-muted-foreground">
              Publish the work first. You can make pieces collectible, sell
              editions, or add collector-only downloads when the piece calls for it.
            </p>
          </Stack>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            {authenticated ? (
              <Button asChild size="cta">
                <Link to="/">Go to feed</Link>
              </Button>
            ) : (
              <Button size="cta" onClick={() => login()} disabled={!ready}>
                Start creating
              </Button>
            )}
            <Button asChild size="cta" variant="outline">
              <Link to="/download">Get the app</Link>
            </Button>
          </div>
        </div>
      </Region>
    </section>
  )
}
