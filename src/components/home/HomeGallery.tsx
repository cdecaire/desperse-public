/**
 * HomeGallery Component
 * Gallery-first public homepage for unauthenticated visitors. Alternates
 * section types (work grids, marketing bands, featured artist, creators,
 * discover) for a varied, marketplace-style rhythm. Full narrative: /about.
 */

import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { getTrendingPosts, getNewPosts, getEndingSoonPosts } from '@/server/functions/explore'
import { toGalleryPost } from '@/components/gallery/mapPost'
import { CuratedRowPreview } from './CuratedRowPreview'
import { HomeCtaBand } from './HomeCtaBand'
import { ArtistShowcase } from './ArtistShowcase'
import { CategorySpotlight } from './CategorySpotlight'
import { TrendingCreatorsRow } from './TrendingCreatorsRow'
import { BrowseCategories } from './BrowseCategories'
import { PublicHeader, PUBLIC_NAV_ITEMS } from '@/components/layout/PublicHeader'
import { Footer } from '@/components/layout/Footer'

const PREVIEW_LIMIT = 8

// Category featured in the "Curated" spotlight. Category-derived, not
// human-curated — swap freely or wire to admin curation later.
const SPOTLIGHT_CATEGORY = 'Digital Art'

export function HomeGallery() {
  const { login, ready, authenticated } = usePrivy()

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['home-trending-preview'],
    queryFn: async () => {
      const result = await getTrendingPosts({
        data: { limit: PREVIEW_LIMIT, offset: 0 },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to fetch trending posts')
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: mintingData, isLoading: mintingLoading } = useQuery({
    queryKey: ['home-minting-preview'],
    queryFn: async () => {
      const result = await getEndingSoonPosts({
        data: { limit: PREVIEW_LIMIT },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to fetch live mints')
      return result
    },
    staleTime: 1000 * 60, // mint windows are time-sensitive
  })

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['home-new-preview'],
    queryFn: async () => {
      const result = await getNewPosts({
        data: { limit: PREVIEW_LIMIT },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to fetch new posts')
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const trendingPosts = (trendingData?.posts ?? []).map(toGalleryPost)
  const mintingPosts = (mintingData?.posts ?? []).map(toGalleryPost)
  const newPosts = (newData?.posts ?? []).map(toGalleryPost)

  // When trending falls back to recent posts it already IS the "New" row —
  // skip the duplicate section
  const showNewRow = !trendingData?.isFallback

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader navItems={PUBLIC_NAV_ITEMS} />

      {/* Fluid page — max-width is opt-in per region on Desperse, and a gallery
          earns the full canvas. Every section is a direct child so self-hiding
          sections (no data) collapse cleanly; `space-y` owns the rhythm, so a
          vanished section never leaves an empty gap. Inset sections carry their
          own px; bands break full-bleed. */}
      <main className="flex-1 pt-28 pb-24">
        <div className="space-y-16 md:space-y-24">
          {/* Hero */}
          <section className="px-6 md:px-10">
            <h1 className="text-display-3xl">
              Create. Collect. <span className="text-muted-foreground">Own.</span>
            </h1>
            <p className="mt-4 text-body-lg text-muted-foreground max-w-xl">
              Where creative work becomes collectible. Publish your art, mint
              editions, and collect directly from the artists you love — onchain,
              in seconds.
            </p>
            <div className="mt-8 flex items-center gap-6">
              {authenticated ? (
                <Link
                  to="/"
                  className="px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                >
                  Go to Feed
                </Link>
              ) : (
                <button
                  onClick={() => login()}
                  disabled={!ready}
                  className="px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                >
                  Get Started
                </button>
              )}
              <Link
                to="/explore"
                className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive"
              >
                Explore the gallery <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </section>

          {/* Trending — work grid (self-hides if empty) */}
          <CuratedRowPreview
            title={trendingData?.sectionTitle ?? 'Trending'}
            posts={trendingPosts}
            isLoading={trendingLoading}
            viewAllTab="trending"
            eager
          />

          {/* Marketing callout — the one filled band */}
          <HomeCtaBand />

          {/* Minting Now — work grid (often empty; self-hides) */}
          <CuratedRowPreview
            title="Minting Now"
            posts={mintingPosts}
            isLoading={mintingLoading && !mintingData}
            viewAllTab="minting"
          />

          {/* Featured artist (self-hides if none qualifies) */}
          <ArtistShowcase />

          {/* Curated category spotlight (self-hides if empty) */}
          <CategorySpotlight category={SPOTLIGHT_CATEGORY} limit={PREVIEW_LIMIT} />

          {/* Trending creators (self-hides if none) */}
          <TrendingCreatorsRow />

          {/* New — work grid */}
          {showNewRow && (
            <CuratedRowPreview
              title="New"
              posts={newPosts}
              isLoading={newLoading}
              viewAllTab="new"
            />
          )}

          {/* Discover by category — static, always present */}
          <BrowseCategories />

          {/* Creator recruitment — quiet band, full story lives at /about */}
          <section className="px-6 md:px-10">
            <div className="border-t border-border pt-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-heading-2">Made by an artist? Keep 95%.</h2>
                <p className="mt-2 text-body-md text-muted-foreground max-w-lg">
                  Publish free posts, open editions, or limited drops — collectors
                  mint directly from you. No ads, no algorithms, no middlemen.
                </p>
              </div>
              <Link
                to="/about"
                className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive shrink-0"
              >
                How Desperse works <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer showCta={false} fluid />
    </div>
  )
}
