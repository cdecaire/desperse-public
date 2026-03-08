/**
 * Landing Page Component
 * Used for unauthenticated users on the home page and /about route
 */

import { Link } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Switch } from '@/components/ui/switch'
import { Logo } from '@/components/shared/Logo'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { getOptimizedImageUrl } from '@/lib/imageUrl'
import { getTrendingPosts, getFeaturedCreators, getLandingProfilePreview } from '@/server/functions/explore'
import Lenis from 'lenis'

// Type for featured creator from API
type FeaturedCreator = {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  headerBgUrl: string | null
  followerCount: number
  postCount: number
  mintCount: number
}

// Type for trending post from API
type TrendingPost = {
  id: string
  mediaUrl: string
  coverUrl: string | null
  caption: string | null
  user?: {
    id: string
    displayName: string | null
    usernameSlug: string
    avatarUrl: string | null
  }
}

// Placeholder image component
function PlaceholderImage({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-muted border border-border rounded-lg ${className}`}
    />
  )
}

// Detect media type from URL extension
function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'other' {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) return 'image'
  if (['mp4', 'webm', 'mov'].includes(extension || '')) return 'video'
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'audio'
  return 'other'
}

// Media thumbnail for landing page - handles images, videos, and audio gracefully
function LandingMediaThumbnail({
  post,
  width = 480,
  className = '',
  imgClassName = '',
}: {
  post: TrendingPost
  width?: 320 | 480 | 640
  className?: string
  imgClassName?: string
}) {
  const mediaType = detectMediaType(post.mediaUrl)
  const displayUrl = post.coverUrl ?? (mediaType === 'image' ? post.mediaUrl : null)

  // Image or any type with a cover URL - render as <img>
  if (displayUrl) {
    return (
      <img
        src={getOptimizedImageUrl(displayUrl, { width, quality: 75 })}
        alt={post.caption ?? 'Featured post'}
        loading="lazy"
        decoding="async"
        className={imgClassName || className}
      />
    )
  }

  // Video without cover - render as muted autoplay video
  if (mediaType === 'video') {
    return (
      <video
        src={post.mediaUrl}
        muted
        autoPlay
        loop
        playsInline
        className={imgClassName || className}
      />
    )
  }

  // Audio without cover - show music icon placeholder
  if (mediaType === 'audio') {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 ${className}`}>
        <Icon name="music" variant="regular" className="text-4xl text-muted-foreground/50" />
      </div>
    )
  }

  // Other/unknown - show generic placeholder
  return (
    <div className={`flex items-center justify-center bg-muted ${className}`}>
      <Icon name="file" variant="regular" className="text-4xl text-muted-foreground/50" />
    </div>
  )
}

// Lenis smooth scroll hook — respects prefers-reduced-motion
function useLenis() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return lenisRef
}

// Scroll reveal hook - observes container and activates children with .reveal-text
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = container.querySelectorAll('.reveal-text')
            elements.forEach((el) => el.classList.add('active'))
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return ref
}


// Header Component
function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { login, ready, authenticated } = usePrivy()
  const isSystemTheme = theme === 'system' || theme === undefined
  const activeTheme = isSystemTheme ? (resolvedTheme || 'dark') : theme

  const handleThemeToggle = () => {
    if (isSystemTheme) {
      setTheme(activeTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50">
      <Link to="/" className="flex-1 flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <Logo size={15} className="text-foreground" />
        <span className="text-xl font-extrabold">Desperse</span>
      </Link>
      <nav className="hidden md:flex gap-8 text-sm font-medium">
        <Link to="/browse" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Browse
        </Link>
        <a href="#features" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Features
        </a>
        <a href="#creators" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Creators
        </a>
        <a href="#why" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Why Desperse
        </a>
      </nav>
      <div className="flex-1 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Icon name={activeTheme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="text-sm" />
          <Switch
            checked={activeTheme === 'dark'}
            onCheckedChange={handleThemeToggle}
            aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} theme`}
            className="scale-75"
          />
        </div>
        {authenticated ? (
          <Link
            to="/"
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-colors duration-200"
          >
            Go to Feed
          </Link>
        ) : (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-colors duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  )
}

// Hero Section
function Hero() {
  const revealRef = useReveal()
  const { login, ready } = usePrivy()

  return (
    <section className="min-h-screen flex flex-col justify-center px-6 pt-20 relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--muted-foreground) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div ref={revealRef} className="z-10 max-w-7xl mx-auto w-full">
        <h1 className="text-[12vw] leading-[0.9] font-extrabold tracking-tighter overflow-hidden">
          <span className="block reveal-text">CREATE.</span>
          <span className="block reveal-text" style={{ transitionDelay: '0.1s' }}>COLLECT.</span>
          <span className="block reveal-text text-zinc-500 dark:text-zinc-400" style={{ transitionDelay: '0.2s' }}>OWN.</span>
        </h1>

        <div className="mt-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <p className="text-xl md:text-2xl max-w-xl text-zinc-600 dark:text-zinc-400 font-light reveal-text" style={{ transitionDelay: '0.3s' }}>
            The platform where creative work becomes collectible.{' '}
            <span className="text-zinc-950 dark:text-white">Publish photos, videos, and art — own them onchain.</span>
          </p>
          <div className="reveal-text flex items-center gap-6" style={{ transitionDelay: '0.4s' }}>
            <button
              onClick={() => login()}
              disabled={!ready}
              className="px-8 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
            >
              Get Started
            </button>
            <a
              href="#features"
              className="group flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              See how it works
              <span className="group-hover:translate-x-1 transition-transform">&darr;</span>
            </a>
          </div>
        </div>
      </div>

    </section>
  )
}

// Infinite Marquee — subtle divider between hero and content
function Marquee() {
  const items = ['PUBLISH', 'MINT', 'COLLECT', 'OWN']
  // Render two identical halves so translateX(-50%) creates a seamless loop
  const half = Array.from({ length: 6 }, () => items).flat()

  return (
    <div className="py-6 border-t border-border overflow-hidden">
      <div className="marquee-track flex whitespace-nowrap w-max">
        {[half, half].map((group, gi) => (
          <div key={gi} className="flex shrink-0">
            {group.map((item, i) => (
              <span key={i} className="flex items-center">
                <span className="text-sm md:text-base font-mono tracking-widest px-8 text-muted-foreground/60">
                  {item}
                </span>
                <span className="text-muted-foreground/30 text-xs">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}

// Phone frame with live profile preview (iPhone 17 Pro proportions)
function PhoneProfilePreview() {
  const { data } = useQuery({
    queryKey: ['landing-profile-preview'],
    queryFn: async () => {
      const result = await getLandingProfilePreview({} as never)
      return result
    },
    staleTime: 1000 * 60 * 10,
  })

  const creator = data?.creator
  const creatorPosts = data?.posts ?? []

  return (
    <div className="phone-frame scroll-reveal w-[260px] md:w-[280px]">
      {/* iPhone frame — container query context */}
      <div className="iphone-frame">
        {/* Side buttons */}
        <div className="iphone-btn-action" aria-hidden="true" />
        <div className="iphone-btn-vol-up" aria-hidden="true" />
        <div className="iphone-btn-vol-down" aria-hidden="true" />
        <div className="iphone-btn-power" aria-hidden="true" />

        {/* Screen */}
        <div className="iphone-screen">
          {/* Dynamic Island */}
          <div className="iphone-dynamic-island" aria-hidden="true" />

          {/* Profile content */}
          <div className="relative w-full h-full bg-background overflow-y-hidden">
            {creator ? (
              <>
                {/* Banner */}
                <div className="h-[22%] bg-linear-to-br from-muted via-muted/80 to-muted/60 relative overflow-hidden">
                  {creator.headerBgUrl && (
                    <img
                      src={getOptimizedImageUrl(creator.headerBgUrl, { width: 480, quality: 70 })}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Profile info */}
                <div className="px-[5%] -mt-[10%] relative">
                  <div className="w-[20%] aspect-square rounded-full border-[2px] border-background bg-muted overflow-hidden">
                    {creator.avatarUrl ? (
                      <img
                        src={getOptimizedImageUrl(creator.avatarUrl, { width: 320, quality: 75 })}
                        alt={creator.displayName || creator.usernameSlug}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Icon name="user" variant="regular" className="text-xl" />
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5">
                    <p className="font-bold text-[11px] truncate">{creator.displayName || creator.usernameSlug}</p>
                    <p className="text-[9px] text-muted-foreground">@{creator.usernameSlug}</p>

                    {creator.bio && (
                      <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{creator.bio}</p>
                    )}

                    <div className="flex gap-3 mt-2">
                      <div>
                        <span className="text-[10px] font-bold">{creator.postCount}</span>{' '}
                        <span className="text-[8px] text-muted-foreground">posts</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold">{creator.followerCount}</span>{' '}
                        <span className="text-[8px] text-muted-foreground">followers</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold">{creator.mintCount}</span>{' '}
                        <span className="text-[8px] text-muted-foreground">mints</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post grid */}
                <div className="mt-3 px-[1%]">
                  <div className="grid grid-cols-3 gap-px">
                    {creatorPosts.slice(0, 9).map((post) => (
                      <div key={post.id} className="aspect-square bg-muted overflow-hidden">
                        <LandingMediaThumbnail
                          post={post as TrendingPost}
                          width={320}
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Skeleton
              <div>
                <div className="h-[22%] bg-muted animate-pulse" />
                <div className="px-[5%] -mt-[10%]">
                  <div className="w-[20%] aspect-square rounded-full bg-muted border-2 border-background animate-pulse" />
                  <div className="mt-1.5 space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-2 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="mt-3 px-[1%] grid grid-cols-3 gap-px">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="aspect-square bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// For Collectors Card with live phone preview
function ForCollectorsCard() {
  return (
    <div className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-30 transition-all duration-500 ease-out">
      <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
        <div className="order-2 md:order-1 scroll-reveal">
          <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">03 / FOR COLLECTORS</span>
          <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Collect what <br />
            <span className="text-zinc-600 dark:text-zinc-400">you care about.</span>
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
            Discover work from creators you love, collect pieces that resonate, and own them onchain.
          </p>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
            Every collectible is tied directly to the creator and lives in your wallet.
          </p>
        </div>
        <div className="order-1 md:order-2 flex justify-center items-center">
          <PhoneProfilePreview />
        </div>
      </div>
    </div>
  )
}

// Sticky Card Stack Section
function StickyCards() {
  const { login, ready } = usePrivy()
  const { data } = useQuery({
    queryKey: ['landing-feature-posts'],
    queryFn: async () => {
      const result = await getTrendingPosts({
        data: { limit: 5, offset: 0 },
      } as never)
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: creatorsData } = useQuery({
    queryKey: ['landing-featured-creators'],
    queryFn: async () => {
      const result = await getFeaturedCreators({
        data: { limit: 2 },
      } as never)
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const allPosts = (data?.posts ?? []) as TrendingPost[]
  const posts = allPosts.slice(0, 4)
  const creators = (creatorsData?.creators ?? []) as FeaturedCreator[]
  const [activeIndex, setActiveIndex] = useState(0)

  const handleImageClick = () => {
    if (posts.length > 0) {
      setActiveIndex((prev) => (prev + 1) % posts.length)
    }
  }

  return (
    <div id="features" className="relative">
      {/* Card 1 - What Desperse Is */}
      <div className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-10 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1 scroll-reveal">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">01 / WHAT DESPERSE IS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Built for creators, <br />
              <span className="text-zinc-600 dark:text-zinc-400">not algorithms.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Desperse is a platform where creative work becomes collectible. Creators publish work directly, and collectors can mint and own it onchain.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              No algorithms deciding who sees your work. Just creative output and direct collector support.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            {posts.length > 0 ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Shuffle featured posts"
                className="relative w-64 h-80 md:w-80 md:h-96 cursor-pointer"
                onClick={handleImageClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleImageClick() } }}
              >
                {posts.map((post, index) => {
                  const stackPosition = (index - activeIndex + posts.length) % posts.length
                  const rotations = [0, 6, -4, 10]
                  const offsets = [0, 12, 24, 36]
                  const blurs = [0, 1, 2, 3]
                  const scales = [1, 0.97, 0.94, 0.91]
                  const opacities = [1, 0.7, 0.5, 0.3]
                  const shadows = [
                    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                    '0 20px 40px -12px rgba(0, 0, 0, 0.3)',
                    '0 15px 30px -12px rgba(0, 0, 0, 0.2)',
                    '0 10px 20px -12px rgba(0, 0, 0, 0.1)',
                  ]

                  return (
                    <div
                      key={post.id}
                      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden transition-all duration-500 ease-out"
                      style={{
                        transform: `rotate(${rotations[stackPosition] ?? 0}deg) translateX(${offsets[stackPosition] ?? 0}px) scale(${scales[stackPosition] ?? 1})`,
                        zIndex: posts.length - stackPosition,
                        opacity: opacities[stackPosition] ?? 0,
                        filter: `blur(${blurs[stackPosition] ?? 0}px)`,
                        boxShadow: shadows[stackPosition] ?? shadows[3],
                      }}
                    >
                      <LandingMediaThumbnail
                        post={post}
                        width={480}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover"
                      />
                    </div>
                  )
                })}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                  <span className="hidden md:inline">Click</span>
                  <span className="md:hidden">Tap</span> to shuffle
                </div>
              </div>
            ) : (
              <div className="w-64 h-80 md:w-80 md:h-96 bg-muted rounded-2xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Card 2 - For Creators */}
      <div className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-20 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1 scroll-reveal">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">02 / FOR CREATORS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Your work. <br />
              <span className="text-zinc-600 dark:text-zinc-400">Your ownership.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Share your work, release free or limited editions, and earn directly from collectors who choose to support you.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              No ads. No intermediaries. Just publishing, minting, and building a collector base around your work.
            </p>
            <div className="mt-8 flex items-baseline gap-6">
              <div>
                <span className="text-5xl md:text-6xl font-extrabold tracking-tight">95</span>
                <span className="text-2xl font-extrabold text-zinc-400 dark:text-zinc-500">%</span>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">of every sale</div>
              </div>
              <div className="text-zinc-300 dark:text-zinc-700 text-2xl font-light">/</div>
              <div>
                <span className="text-3xl font-extrabold text-zinc-400 dark:text-zinc-500">5</span>
                <span className="text-lg font-extrabold text-zinc-400 dark:text-zinc-600">%</span>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">platform</div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center relative h-96">
            {creators.length > 0 ? (
              <>
                {/* Back card (second creator or placeholder) */}
                {creators[1] ? (
                  <Link
                    to="/profile/$slug"
                    params={{ slug: creators[1].usernameSlug }}
                    className="w-64 h-80 rounded-xl absolute top-0 right-4 rotate-6 border border-border opacity-70 p-5 flex flex-col justify-between hover:opacity-80 transition-opacity overflow-hidden"
                    style={{
                      backgroundImage: creators[1].headerBgUrl
                        ? `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%), url(${getOptimizedImageUrl(creators[1].headerBgUrl, { width: 480, quality: 75 })})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: creators[1].headerBgUrl ? undefined : 'var(--card)',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      {creators[1].avatarUrl ? (
                        <OptimizedImage
                          src={creators[1].avatarUrl}
                          alt={creators[1].displayName || creators[1].usernameSlug}
                          width={320}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                          fadeIn={false}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center border-2 border-white/30">
                          <span className="text-sm font-semibold text-white">
                            {creators[1].usernameSlug.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-(--caribbean-green-400) bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                        Creator
                      </div>
                    </div>
                    <div className={creators[1].headerBgUrl ? 'text-white' : ''}>
                      <p className="font-semibold text-sm truncate">{creators[1].displayName || `@${creators[1].usernameSlug}`}</p>
                      <p className={`text-xs ${creators[1].headerBgUrl ? 'text-white/70' : 'text-muted-foreground'}`}>@{creators[1].usernameSlug}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="w-64 h-80 bg-muted rounded-xl absolute top-0 right-4 rotate-6 border border-border opacity-60" />
                )}

                {/* Front card (first creator) */}
                <Link
                  to="/profile/$slug"
                  params={{ slug: creators[0].usernameSlug }}
                  className="w-64 h-80 rounded-xl relative z-10 -rotate-3 border border-border p-5 flex flex-col justify-between shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-rotate-1 transition-all duration-300 ease-out overflow-hidden"
                  style={{
                    backgroundImage: creators[0].headerBgUrl
                      ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%), url(${getOptimizedImageUrl(creators[0].headerBgUrl, { width: 480, quality: 75 })})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: creators[0].headerBgUrl ? undefined : 'var(--card)',
                  }}
                >
                  <div className="flex justify-between items-start">
                    {creators[0].avatarUrl ? (
                      <OptimizedImage
                        src={creators[0].avatarUrl}
                        alt={creators[0].displayName || creators[0].usernameSlug}
                        width={320}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                        fadeIn={false}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur flex items-center justify-center border-2 border-white/30">
                        <span className="text-lg font-semibold text-white">
                          {creators[0].usernameSlug.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-(--caribbean-green-400) bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                      Creator
                    </div>
                  </div>

                  <div className={`space-y-3 ${creators[0].headerBgUrl ? 'text-white' : ''}`}>
                    <div>
                      <p className="font-bold text-lg truncate">{creators[0].displayName || `@${creators[0].usernameSlug}`}</p>
                      <p className={`text-sm ${creators[0].headerBgUrl ? 'text-white/70' : 'text-muted-foreground'}`}>@{creators[0].usernameSlug}</p>
                    </div>
                    <div className={`flex gap-4 pt-2 border-t ${creators[0].headerBgUrl ? 'border-white/20' : 'border-border'}`}>
                      <div>
                        <p className="font-bold text-lg">{creators[0].postCount}</p>
                        <p className={`text-[10px] ${creators[0].headerBgUrl ? 'text-white/60' : 'text-muted-foreground'}`}>Posts</p>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{creators[0].mintCount}</p>
                        <p className={`text-[10px] ${creators[0].headerBgUrl ? 'text-white/60' : 'text-muted-foreground'}`}>Mints</p>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{creators[0].followerCount}</p>
                        <p className={`text-[10px] ${creators[0].headerBgUrl ? 'text-white/60' : 'text-muted-foreground'}`}>Followers</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            ) : (
              <>
                {/* Placeholder cards when no creators */}
                <div className="w-64 h-80 bg-muted rounded-xl absolute top-0 right-4 rotate-6 border border-border opacity-60" />
                <div className="w-64 h-80 bg-card rounded-xl relative z-10 -rotate-3 border border-border p-5 flex flex-col justify-between shadow-2xl">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                    <div className="text-[10px] font-mono text-(--caribbean-green-500)">
                      Creator
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex gap-4 pt-2 border-t border-border">
                      <div className="h-8 w-12 bg-muted rounded animate-pulse" />
                      <div className="h-8 w-12 bg-muted rounded animate-pulse" />
                      <div className="h-8 w-12 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card 3 - For Collectors */}
      <ForCollectorsCard />

      {/* Card 4 - How Minting Works */}
      <div className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-40 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1 scroll-reveal">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">04 / HOW MINTING WORKS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Fast, affordable, <br />
              <span className="text-zinc-600 dark:text-zinc-400">and onchain.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Desperse is built on Solana, making minting quick and low-cost. Creators can offer free mints or priced editions in SOL or USDC, with optional supply limits.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              The focus stays on the work, not the transaction overhead.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="w-80 scroll-reveal">
              {/* Mint receipt card */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl mint-receipt">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">MINT CONFIRMED</span>
                    <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mint-pulse" />
                      Success
                    </span>
                  </div>
                  <p className="font-bold text-lg truncate">Untitled #247</p>
                  <p className="text-sm text-muted-foreground">by @creator</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 divide-x divide-border/50">
                  <div className="px-4 py-5 text-center mint-stat">
                    <p className="text-2xl font-extrabold tracking-tight">0.01</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">SOL COST</p>
                  </div>
                  <div className="px-4 py-5 text-center mint-stat" style={{ transitionDelay: '100ms' }}>
                    <p className="text-2xl font-extrabold tracking-tight">0.4s</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">FINALITY</p>
                  </div>
                  <div className="px-4 py-5 text-center mint-stat" style={{ transitionDelay: '200ms' }}>
                    <p className="text-2xl font-extrabold tracking-tight">1/50</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">EDITION</p>
                  </div>
                </div>

                {/* Transaction hash footer */}
                <div className="px-6 py-3 bg-muted/30 border-t border-border/50">
                  <p className="text-[10px] font-mono text-muted-foreground/60 truncate">
                    tx: 4sGjM...vK9nR2...confirmed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5 - Easy to Get Started */}
      <div className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-50 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1 scroll-reveal">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">05 / GET STARTED IN SECONDS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              No friction <br />
              <span className="text-zinc-600 dark:text-zinc-400">to try it.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Sign up and start collecting immediately — Desperse creates a wallet for you. Connect your own wallet anytime you're ready.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Lower friction for newcomers. Full ownership when you want it.
            </p>
            <button
              onClick={() => login()}
              disabled={!ready}
              className="mt-8 px-6 py-3 border-2 border-zinc-950 dark:border-white rounded-full text-sm font-bold hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
            >
              Try it now — it's free
            </button>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="w-80 scroll-reveal">
              {/* Vertical timeline */}
              <div className="relative pl-8">
                {/* Connecting line */}
                <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border timeline-line" />

                {[
                  {
                    icon: 'envelope' as const,
                    color: 'var(--blue-gem-600)',
                    title: 'Sign up with email',
                    desc: 'Or Google, Apple, X — no wallet needed',
                    tag: null,
                  },
                  {
                    icon: 'wallet' as const,
                    color: 'var(--purple-heart-500)',
                    title: 'Wallet ready instantly',
                    desc: 'Created for you, secured by Privy',
                    tag: 'Automatic',
                  },
                  {
                    icon: 'link-simple' as const,
                    color: 'var(--flush-orange-500)',
                    title: 'Connect your own wallet',
                    desc: 'Phantom, Solflare, or any Solana wallet',
                    tag: 'Optional',
                  },
                  {
                    icon: 'key' as const,
                    color: 'var(--caribbean-green-500)',
                    title: 'You own everything',
                    desc: 'Your keys, your collectibles, your data',
                    tag: null,
                  },
                ].map((step, i) => (
                  <div key={step.title} className="relative flex items-start gap-4 pb-8 last:pb-0 timeline-step" style={{ transitionDelay: `${i * 120}ms` }}>
                    {/* Node */}
                    <div
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center z-10 -ml-8 timeline-node"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon name={step.icon} variant="regular" className="text-white text-sm" />
                    </div>

                    {/* Content */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{step.title}</p>
                        {step.tag && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {step.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 6 - Why Desperse (merged: value prop + comparison table + CTA) */}
      <div id="why" className="md:sticky md:top-16 min-h-[80vh] md:min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-60 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1 scroll-reveal">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">06 / WHY DESPERSE</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Creators deserve <br />
              <span className="text-zinc-600 dark:text-zinc-400">more than likes.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Traditional platforms optimize for engagement. Desperse is built around ownership, value, and direct relationships between creators and collectors.
            </p>
            <button
              onClick={() => login()}
              disabled={!ready}
              className="mt-8 px-8 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
            >
              Join the Beta
            </button>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="w-full max-w-lg border border-border rounded-xl overflow-hidden bg-card/50">
              <div className="grid grid-cols-2">
                <div className="px-4 py-3 border-b border-r border-border">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-500">WHAT WE DON'T DO</span>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-500">WHAT WE DO INSTEAD</span>
                </div>
              </div>
              {[
                { bad: 'Ads', good: 'Never. You only see creators you follow.' },
                { bad: 'Data harvesting', good: "We don't scrape, sell, or share your data. Ever." },
                { bad: 'Algorithmic feeds', good: 'You see what you follow. No engagement tricks.' },
                { bad: 'Spam DMs', good: 'Messaging costs a small fee. No spam.' },
                { bad: 'Influencer chasing', good: "Built for creators making work, not farming engagement." },
              ].map((row, i, arr) => (
                <div key={i} className={`grid grid-cols-2 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="px-4 py-4 border-r border-border flex items-center gap-2">
                    <span className="text-red-500 text-lg">&times;</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{row.bad}</span>
                  </div>
                  <div className="px-4 py-4">
                    <span className="text-sm">{row.good}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Gallery Section
function Gallery() {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-trending-posts'],
    queryFn: async () => {
      const result = await getTrendingPosts({
        data: { limit: 3, offset: 0 },
      } as never)
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const posts = (data?.posts ?? []) as TrendingPost[]

  return (
    <section id="creators" className="py-32 px-6 bg-card/30">
      <div className="max-w-7xl mx-auto scroll-reveal-stagger">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <h3 className="text-4xl font-extrabold tracking-tight stagger-item">Discover <br />Creators</h3>
          <Link
            to="/browse"
            className="text-sm border-b border-zinc-950 dark:border-zinc-50 pb-1 hover:text-zinc-600 dark:hover:text-zinc-400 hover:border-zinc-600 dark:hover:border-zinc-400 transition-all mt-4 md:mt-0 stagger-item"
          >
            Browse Posts →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={`relative aspect-4/5 bg-muted rounded-xl overflow-hidden animate-pulse ${i === 1 ? 'lg:mt-12' : ''}`} />
            ))
          ) : posts.length > 0 ? (
            posts.map((post, i) => (
              <Link
                key={post.id}
                to="/post/$postId"
                params={{ postId: post.id }}
                className={`group relative aspect-4/5 bg-muted rounded-xl overflow-hidden stagger-item ${i === 1 ? 'lg:mt-12' : ''}`}
              >
                <LandingMediaThumbnail
                  post={post}
                  width={640}
                  className="w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  imgClassName="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-black/80 to-transparent md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-300">
                  <p className="font-extrabold text-lg text-white truncate mb-2">
                    {post.caption || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2">
                    {post.user?.avatarUrl ? (
                      <OptimizedImage
                        src={post.user.avatarUrl}
                        alt={post.user.displayName || post.user.usernameSlug}
                        width={320}
                        className="w-6 h-6 rounded-full object-cover"
                        fadeIn={false}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {post.user?.usernameSlug?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-zinc-300">@{post.user?.usernameSlug}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            [0, 1, 2].map((i) => (
              <div key={i} className={`group relative aspect-4/5 bg-muted rounded-xl overflow-hidden ${i === 1 ? 'lg:mt-12' : ''}`}>
                <PlaceholderImage className="w-full h-full opacity-60" />
                <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-background to-transparent">
                  <p className="font-extrabold text-lg">Coming Soon</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">@creator</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

// Logo SVG Components
function SolanaLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 397.7 311.7" className={className} style={style} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
      <path d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />
      <path d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />
    </svg>
  )
}

function MetaplexLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 235 156" className={className} style={style} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M116.008 114.088C117.107 112.465 117.236 110.322 116.202 108.634L53.4497 2.46747C52.545 0.909069 50.9292 0 49.1198 0H5.0442C1.16658 0 -1.28924 4.22068 0.714197 7.59722L83.1781 149.023C84.9877 152.204 89.5761 152.399 91.6442 149.347L116.008 114.088ZM39.8135 146.815C41.8169 150.191 39.3611 154.477 35.4834 154.477H5.23808C2.45912 154.477 0.197181 152.204 0.197181 149.411V98.2444C0.197181 93.0496 6.98301 91.2315 9.56807 95.647L39.8135 146.815Z" />
      <path d="M234.147 148.243C236.085 151.619 233.694 155.841 229.817 155.841H186C184.19 155.841 182.574 154.866 181.669 153.307L96.6851 7.59722C94.7463 4.22068 97.1375 9.00278e-09 101.015 9.00278e-09H145.026C146.835 9.00278e-09 148.451 0.974002 149.356 2.53241L234.147 148.243Z" />
    </svg>
  )
}

function PrivyLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 59 59" className={className} style={style} fill="currentColor">
      <path d="M 28.746094 0.015625 C 28.359375 0.03125 27.722656 0.0703125 27.363281 0.105469 C 22.929688 0.515625 18.730469 2.207031 15.242188 4.992188 C 10.347656 8.894531 7.28125 14.597656 6.730469 20.804688 C 6.667969 21.515625 6.648438 21.972656 6.648438 22.863281 C 6.648438 23.753906 6.667969 24.207031 6.730469 24.929688 C 7.152344 29.683594 9.066406 34.183594 12.210938 37.816406 C 13.949219 39.832031 16.046875 41.53125 18.394531 42.84375 C 18.953125 43.15625 19.9375 43.636719 20.53125 43.890625 C 22.722656 44.820312 25.042969 45.40625 27.398438 45.617188 C 28.769531 45.746094 30.207031 45.746094 31.578125 45.617188 C 35.304688 45.28125 38.875 44.035156 42.035156 41.964844 C 43.890625 40.75 45.613281 39.210938 47.058594 37.476562 C 49.902344 34.066406 51.683594 29.910156 52.1875 25.5 C 52.386719 23.769531 52.386719 21.882812 52.179688 20.144531 C 51.65625 15.714844 49.839844 11.539062 46.96875 8.132812 C 46.183594 7.207031 45.144531 6.164062 44.21875 5.382812 C 42.054688 3.558594 39.523438 2.128906 36.859375 1.222656 C 34.933594 0.570312 33.109375 0.207031 31.019531 0.0585938 C 30.558594 0.0234375 29.148438 -0.00390625 28.746094 0.015625 Z M 28.746094 0.015625" />
      <path d="M 27.191406 52.46875 C 20.148438 52.691406 14.652344 53.902344 13.953125 55.386719 C 13.894531 55.519531 13.882812 55.566406 13.882812 55.722656 C 13.882812 55.886719 13.890625 55.921875 13.960938 56.0625 C 14.652344 57.472656 19.667969 58.636719 26.300781 58.929688 C 32.234375 59.195312 38.464844 58.695312 42.054688 57.664062 C 43.746094 57.175781 44.730469 56.644531 45.023438 56.050781 C 45.085938 55.925781 45.09375 55.882812 45.09375 55.722656 C 45.09375 55.457031 45.011719 55.285156 44.757812 55.035156 C 44.535156 54.8125 44.269531 54.636719 43.878906 54.441406 C 41.730469 53.378906 37.152344 52.636719 31.660156 52.464844 C 30.820312 52.441406 28.054688 52.441406 27.191406 52.46875 Z M 27.191406 52.46875" />
    </svg>
  )
}

// Tech Specs Section
function TechSpecs() {
  return (
    <section id="tech" className="py-24 border-y border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 scroll-reveal-stagger">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border rounded-xl p-6 bg-card/50 stagger-item">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--purple-heart-500) 20%, transparent)' }}
            >
              <SolanaLogo className="w-6 h-6" style={{ color: 'var(--purple-heart-500)' }} />
            </div>
            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">NETWORK</p>
            <p className="text-2xl font-extrabold mb-2">Solana</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Built on the fastest chain for fast, low-cost transactions.</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card/50 stagger-item">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--caribbean-green-500) 20%, transparent)' }}
            >
              <MetaplexLogo className="w-6 h-6" style={{ color: 'var(--caribbean-green-500)' }} />
            </div>
            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">STANDARD</p>
            <p className="text-2xl font-extrabold mb-2">Metaplex</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">The NFT standard. Interoperable across the Solana ecosystem.</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card/50 stagger-item">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--blue-gem-500) 20%, transparent)' }}
            >
              <PrivyLogo className="w-6 h-6" style={{ color: 'var(--blue-gem-500)' }} />
            </div>
            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">SECURITY</p>
            <p className="text-2xl font-extrabold mb-2">Non-Custodial</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">You own your keys. Embedded wallets powered by Privy.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer (exported for use in other layouts)
export function Footer({ showCta = true }: { showCta?: boolean }) {
  const { login, ready } = usePrivy()
  return (
    <footer className={`${showCta ? 'py-20' : 'py-12'} px-6 bg-background relative overflow-hidden`}>
      <div className="max-w-7xl mx-auto relative z-10">
        {showCta && (
          <>
            <div className="text-center mb-16">
              <p className="text-2xl md:text-3xl font-light text-zinc-600 dark:text-zinc-400 mb-8">
                Start creating and collecting today.
              </p>
              <button
                onClick={() => login()}
                disabled={!ready}
                className="px-10 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full text-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
              >
                Get Started — It's Free
              </button>
            </div>

            <p aria-hidden="true" className="text-[15vw] xl:text-[12rem] 2xl:text-[14rem] leading-none font-extrabold tracking-tighter text-center whitespace-nowrap opacity-10 cursor-default select-none mt-8">
              DESPERSE
            </p>
          </>
        )}

        <div className={`flex flex-col md:flex-row justify-between items-start md:items-end ${showCta ? 'mt-12 pt-12 border-t border-border' : ''}`}>
          <nav aria-label="Footer" className="space-y-4">
            <Link to="/privacy" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Terms of Service
            </Link>
            <Link to="/fees" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Fees
            </Link>
          </nav>

          <div className="mt-8 md:mt-0 text-right">
            <div className="flex gap-6 mb-4 md:justify-end">
              <a href="https://x.com/DesperseApp" target="_blank" rel="noopener noreferrer" className="text-zinc-950 dark:text-zinc-50 hover:opacity-70">Twitter/X</a>
            </div>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm">© {new Date().getFullYear()} Desperse. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Floating CTA that appears after scrolling past hero
function FloatingCta({ lenisRef }: { lenisRef: React.RefObject<Lenis | null> }) {
  const { login, ready } = usePrivy()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const threshold = window.innerHeight * 0.8

    // If Lenis is active, use its scroll event; otherwise fall back to native scroll
    const lenis = lenisRef.current
    if (lenis) {
      const onLenisScroll = ({ scroll }: { scroll: number }) => {
        setVisible(scroll > threshold)
      }
      lenis.on('scroll', onLenisScroll)
      return () => lenis.off('scroll', onLenisScroll)
    }

    const handleScroll = () => {
      setVisible(window.scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lenisRef])

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <button
        onClick={() => login()}
        disabled={!ready}
        className="px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full shadow-2xl hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
      >
        Get Started
      </button>
    </div>
  )
}

// Global scroll reveal observer — activates .scroll-reveal and .scroll-reveal-stagger elements
function useGlobalRevealObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}

// Main Landing Page Component
export function LandingPage() {
  const lenisRef = useLenis()
  useGlobalRevealObserver()

  return (
    <div className="min-h-screen bg-background text-zinc-950 dark:text-zinc-50">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <StickyCards />
        <Gallery />
        <TechSpecs />
      </main>
      <Footer />
      <FloatingCta lenisRef={lenisRef} />
      <LandingAnimationStyles />
    </div>
  )
}

// Consolidated animation styles
function LandingAnimationStyles() {
  return (
    <style>{`
      /* Hero text reveal */
      .reveal-text {
        transform: translateY(100%);
        opacity: 0;
        transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .reveal-text.active {
        transform: translateY(0);
        opacity: 1;
      }

      /* Marquee */
      .marquee-track {
        animation: marquee-scroll 30s linear infinite;
      }
      @keyframes marquee-scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      /* Scroll reveal — fade + slide up */
      .scroll-reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .scroll-reveal.active {
        opacity: 1;
        transform: translateY(0);
      }

      /* Staggered reveal container */
      .scroll-reveal-stagger .stagger-item {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .scroll-reveal-stagger.active .stagger-item:nth-child(1) { transition-delay: 0ms; }
      .scroll-reveal-stagger.active .stagger-item:nth-child(2) { transition-delay: 100ms; }
      .scroll-reveal-stagger.active .stagger-item:nth-child(3) { transition-delay: 200ms; }
      .scroll-reveal-stagger.active .stagger-item:nth-child(4) { transition-delay: 300ms; }
      .scroll-reveal-stagger.active .stagger-item:nth-child(5) { transition-delay: 400ms; }
      .scroll-reveal-stagger.active .stagger-item {
        opacity: 1;
        transform: translateY(0);
      }

      /* iPhone 17 Pro frame — cqi-based responsive mockup */
      .phone-frame {
        container-type: inline-size;
        position: relative;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .phone-frame:hover {
        transform: translateY(-6px) rotate(-1deg);
      }
      .iphone-frame {
        position: relative;
        aspect-ratio: 16 / 33;
        width: 100%;
        background: #080808;
        border-radius: 17.5cqi;
        padding: 3.125cqi;
        box-sizing: border-box;
        box-shadow:
          0 0 0 1.25cqi light-dark(#6a6a6c, #4a4a4c),
          0 0 0 1.56cqi light-dark(#555, #111);
      }
      .iphone-screen {
        position: relative;
        width: 100%;
        height: 100%;
        background: #000;
        border-radius: 14.375cqi;
        overflow: hidden;
      }
      .iphone-dynamic-island {
        position: absolute;
        top: 4.375cqi;
        left: 50%;
        transform: translateX(-50%);
        width: 21.25cqi;
        height: 8.125cqi;
        background: #000;
        border-radius: 6.25cqi;
        z-index: 2;
      }
      .iphone-btn-action {
        position: absolute;
        width: 0.94cqi;
        height: 7.5cqi;
        left: -2.19cqi;
        top: 39.06cqi;
        background: light-dark(#6a6a6c, #4a4a4c);
        border-radius: 2px 0 0 2px;
      }
      .iphone-btn-vol-up {
        position: absolute;
        width: 0.94cqi;
        height: 14.06cqi;
        left: -2.19cqi;
        top: 53.13cqi;
        background: light-dark(#6a6a6c, #4a4a4c);
        border-radius: 2px 0 0 2px;
      }
      .iphone-btn-vol-down {
        position: absolute;
        width: 0.94cqi;
        height: 14.06cqi;
        left: -2.19cqi;
        top: 70.31cqi;
        background: light-dark(#6a6a6c, #4a4a4c);
        border-radius: 2px 0 0 2px;
      }
      .iphone-btn-power {
        position: absolute;
        width: 0.94cqi;
        height: 23.44cqi;
        right: -2.19cqi;
        top: 59.38cqi;
        background: light-dark(#6a6a6c, #4a4a4c);
        border-radius: 0 2px 2px 0;
      }

      /* Mint receipt — stats count up feel */
      .mint-receipt .mint-stat {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .scroll-reveal.active .mint-receipt .mint-stat {
        opacity: 1;
        transform: translateY(0);
      }

      /* Mint pulse dot */
      .mint-pulse {
        animation: mint-pulse-anim 2s ease-in-out infinite;
      }
      @keyframes mint-pulse-anim {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      /* Mint receipt hover */
      .mint-receipt {
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mint-receipt:hover {
        transform: translateY(-4px);
        box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.3);
      }

      /* Timeline — line draws down */
      .timeline-line {
        transform-origin: top;
        transform: scaleY(0);
        transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .scroll-reveal.active .timeline-line {
        transform: scaleY(1);
      }

      /* Timeline steps stagger in */
      .timeline-step {
        opacity: 0;
        transform: translateX(-12px);
        transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .scroll-reveal.active .timeline-step {
        opacity: 1;
        transform: translateX(0);
      }

      /* Timeline node pulse on hover */
      .timeline-node {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .timeline-step:hover .timeline-node {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 15%, transparent);
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .reveal-text,
        .scroll-reveal,
        .scroll-reveal-stagger .stagger-item,
        .mint-receipt .mint-stat,
        .timeline-step {
          opacity: 1;
          transform: none;
          transition: none;
        }
        .timeline-line {
          transform: scaleY(1);
          transition: none;
        }
        .mint-pulse,
        .marquee-track {
          animation: none;
        }
      }
    `}</style>
  )
}

export default LandingPage
