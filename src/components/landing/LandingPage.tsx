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
import { getTrendingPosts, getFeaturedCreators } from '@/server/functions/explore'

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
  width?: 480 | 640
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

// Scroll reveal hook - observes container and activates all children when visible
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
        <a href="#features" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Features
        </a>
        <a href="#creators" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Creators
        </a>
        <a href="#why" className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          Why
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
        {!authenticated && (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all duration-300 disabled:opacity-50"
          >
            Log in or Sign up
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
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
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
            A creator-first platform for digital collectibles. <br />
            <span className="text-zinc-950 dark:text-white">Publish photos, videos, and art as onchain work.</span>
          </p>
          <div className="reveal-text" style={{ transitionDelay: '0.4s' }}>
            <button
              onClick={() => login()}
              disabled={!ready}
              className="group relative flex items-center gap-3 text-lg font-medium text-zinc-950 dark:text-zinc-50 disabled:opacity-50"
            >
              <span className="h-px w-12 bg-zinc-950 dark:bg-white group-hover:w-20 transition-all duration-300" />
              Get Started
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .reveal-text {
          transform: translateY(100%);
          opacity: 0;
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-text.active {
          transform: translateY(0);
          opacity: 1;
        }
      `}</style>
    </section>
  )
}

// Infinite Marquee
function Marquee() {
  return (
    <div className="py-12 border-y border-border overflow-hidden bg-muted/30 backdrop-blur-sm">
      <div className="marquee-content flex whitespace-nowrap">
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          CREATOR FIRST
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          ONCHAIN OWNERSHIP
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          BUILT ON SOLANA
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          DIGITAL COLLECTIBLES
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        {/* Duplicate for seamless loop */}
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          CREATOR FIRST
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          ONCHAIN OWNERSHIP
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          BUILT ON SOLANA
        </span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8">●</span>
        <span className="text-6xl md:text-8xl font-extrabold tracking-tighter px-8 text-transparent stroke-text">
          DIGITAL COLLECTIBLES
        </span>
      </div>

      <style>{`
        .marquee-content {
          animation: scroll 20s linear infinite;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .stroke-text {
          -webkit-text-stroke: 1px var(--muted-foreground);
        }
      `}</style>
    </div>
  )
}

// For Collectors Card with animated iPhone
function ForCollectorsCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(card)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-30 transition-all duration-500 ease-out"
    >
      <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
        <div className="order-2 md:order-1">
          <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">03 / FOR COLLECTORS</span>
          <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Collect what <br />
            <span className="text-zinc-600 dark:text-zinc-400">you care about.</span>
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
            Discover work from creators you like, mint pieces that resonate, and own them onchain.
          </p>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
            Every collectible is tied directly to the creator and lives in your wallet.
          </p>
        </div>
        <div className="order-1 md:order-2 flex justify-center items-start overflow-hidden h-[500px] md:h-[600px]">
          <img
            src="/iphone-spin-up.png"
            alt="Desperse app on iPhone"
            className={`w-auto h-[550px] md:h-[700px] object-contain object-top transition-all duration-1000 ease-out ${
              isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-24 opacity-0'
            }`}
          />
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
      <div className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-10 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">01 / WHAT DESPERSE IS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Built for creators, <br />
              <span className="text-zinc-600 dark:text-zinc-400">not feeds.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Desperse is a platform where creative work becomes collectible. Creators publish work directly, and collectors can mint and own it onchain.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              This isn't about chasing likes or algorithms. It's about creative output, ownership, and direct support between creators and collectors.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            {posts.length > 0 ? (
              <div
                className="relative w-64 h-80 md:w-80 md:h-96 cursor-pointer"
                onClick={handleImageClick}
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
                  Click to shuffle
                </div>
              </div>
            ) : (
              <div className="w-64 h-80 md:w-80 md:h-96 bg-muted rounded-2xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Card 2 - For Creators */}
      <div className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-20 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">02 / FOR CREATORS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Your work. <br />
              <span className="text-zinc-600 dark:text-zinc-400">Your ownership.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Share your work, release free or limited editions, and earn directly from collectors who choose to support you.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              No ads. No middle layers. Just publishing, minting, and building a collector base around your work.
            </p>
            <div className="mt-8 flex gap-4">
              <div className="border border-border p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-extrabold">95%</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Creator Share</div>
              </div>
              <div className="border border-border p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-extrabold">5%</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Platform Fee</div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center relative h-96">
            {creators.length > 0 ? (
              <>
                {/* Back card (second creator or placeholder) */}
                {creators[1] ? (
                  <a
                    href={`/profile/${creators[1].usernameSlug}`}
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
                  </a>
                ) : (
                  <div className="w-64 h-80 bg-muted rounded-xl absolute top-0 right-4 rotate-6 border border-border opacity-60" />
                )}

                {/* Front card (first creator) */}
                <a
                  href={`/profile/${creators[0].usernameSlug}`}
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
                </a>
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
      <div className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-40 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
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
            <ul className="mt-8 space-y-3 text-zinc-950 dark:text-zinc-50/80">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Free mints or priced editions
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Optional supply limits
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SOL or USDC pricing
              </li>
            </ul>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="relative">
              <div className="w-48 h-48 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-purple-500/50 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">◎</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                SOLANA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5 - Easy to Get Started */}
      <div className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-50 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">05 / EASY TO GET STARTED</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              No friction <br />
              <span className="text-zinc-600 dark:text-zinc-400">to try it.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              You can get started without installing or setting up a wallet first. When you sign up, Desperse creates an embedded wallet for you automatically, and you can connect your own wallet anytime when you're ready.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Lower friction for newcomers. Full ownership when you want it.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="space-y-4 w-72">
              <div className="border border-border rounded-xl p-4 bg-card/50 backdrop-blur flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-(--blue-gem-600) flex items-center justify-center">
                  <Icon name="user-plus" variant="regular" className="text-white text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Sign Up</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Wallet created for you</div>
                </div>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card/50 backdrop-blur flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-(--flush-orange-500) flex items-center justify-center">
                  <Icon name="wallet" variant="regular" className="text-white text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Connect Wallet</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Bring your own</div>
                </div>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card/50 backdrop-blur flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-(--caribbean-green-500) flex items-center justify-center">
                  <Icon name="key" variant="regular" className="text-white text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Full Ownership</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Your keys, your collectibles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 6 - Why It Matters */}
      <div className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-card z-60 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">06 / WHY IT MATTERS</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Creators deserve <br />
              <span className="text-zinc-600 dark:text-zinc-400">more than likes.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Traditional social platforms optimize for engagement. Desperse is built around ownership, value, and direct relationships between creators and collectors.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              It's a different model for sharing work online — one where creative output has lasting value.
            </p>
            <button
              onClick={() => login()}
              disabled={!ready}
              className="mt-8 inline-block px-8 py-4 bg-primary text-primary-foreground font-extrabold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Join the Beta
            </button>
          </div>
          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="text-center">
              <div className="text-8xl md:text-9xl font-extrabold text-zinc-200 dark:text-zinc-800">
                ♾
              </div>
              <p className="mt-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">LASTING VALUE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 7 - Why Desperse */}
      <div id="why" className="md:sticky md:top-16 min-h-screen md:h-screen flex items-center justify-center overflow-hidden border-t border-border bg-background z-70 transition-all duration-500 ease-out">
        <div className="max-w-7xl w-full mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full py-20">
          <div className="order-2 md:order-1">
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-4 block">07 / WHY DESPERSE</span>
            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              We're not another <br />
              <span className="text-zinc-600 dark:text-zinc-400">social platform.</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Traditional social platforms optimize for engagement. They want your attention, your data, and your eyeballs on ads. We want none of that.
            </p>
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
                { bad: 'Ads', good: 'Never. Your feed is just work from creators you follow.' },
                { bad: 'Data harvesting', good: "We don't scrape, sell, or share your personal information. Ever." },
                { bad: 'Algorithmic feeds', good: 'You see what you follow. No engagement tricks.' },
                { bad: 'Spam DMs', good: 'Messages are payment-gated. No unsolicited contact.' },
                { bad: 'Influencer chasing', good: "We're built for creators making work, not personalities farming engagement." },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-2">
                  <div className="px-4 py-4 border-r border-border flex items-center gap-2">
                    <span className="text-red-500 text-lg">×</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{row.bad}</span>
                  </div>
                  <div className="px-4 py-4 border-b border-border last:border-b-0">
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
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <h3 className="text-4xl font-extrabold tracking-tight">Discover <br />Creators</h3>
          <Link
            to="/explore"
            className="text-sm border-b border-zinc-950 dark:border-zinc-50 pb-1 hover:text-zinc-600 dark:hover:text-zinc-400 hover:border-zinc-600 dark:hover:border-zinc-400 transition-all mt-4 md:mt-0"
          >
            Explore Feed →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className={`relative aspect-4/5 bg-muted rounded-xl overflow-hidden animate-pulse ${i === 2 ? 'lg:mt-12' : ''}`} />
            ))
          ) : posts.length > 0 ? (
            posts.map((post, i) => (
              <a
                key={post.id}
                href={`/post/${post.id}`}
                className={`group relative aspect-4/5 bg-muted rounded-xl overflow-hidden ${i === 1 ? 'lg:mt-12' : ''}`}
              >
                <LandingMediaThumbnail
                  post={post}
                  width={640}
                  className="w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  imgClassName="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-black/80 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform">
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
              </a>
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <div key={i} className={`group relative aspect-4/5 bg-muted rounded-xl overflow-hidden ${i === 2 ? 'lg:mt-12' : ''}`}>
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
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border rounded-xl p-6 bg-card/50">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--purple-heart-500) 20%, transparent)' }}
            >
              <SolanaLogo className="w-6 h-6" style={{ color: 'var(--purple-heart-500)' }} />
            </div>
            <h4 className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">NETWORK</h4>
            <p className="text-2xl font-extrabold mb-2">Solana</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Built on the fastest chain for low-cost, high-throughput transactions.</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card/50">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--caribbean-green-500) 20%, transparent)' }}
            >
              <MetaplexLogo className="w-6 h-6" style={{ color: 'var(--caribbean-green-500)' }} />
            </div>
            <h4 className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">STANDARD</h4>
            <p className="text-2xl font-extrabold mb-2">Metaplex</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Industry-standard NFTs with verifiable ownership and metadata.</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card/50">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'color-mix(in srgb, var(--blue-gem-500) 20%, transparent)' }}
            >
              <PrivyLogo className="w-6 h-6" style={{ color: 'var(--blue-gem-500)' }} />
            </div>
            <h4 className="text-zinc-500 dark:text-zinc-500 text-xs font-mono mb-2">SECURITY</h4>
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
  return (
    <footer className={`${showCta ? 'py-20' : 'py-12'} px-6 bg-background relative overflow-hidden`}>
      <div className="max-w-7xl mx-auto relative z-10">
        {showCta && (
          <>
            <div className="text-center mb-16">
              <p className="text-2xl md:text-3xl font-light text-zinc-600 dark:text-zinc-400 mb-6">
                Join the beta at{' '}
                <Link to="/" className="text-zinc-950 dark:text-zinc-50 font-semibold hover:underline">
                  desperse.com
                </Link>
              </p>
              <p className="text-lg text-zinc-500 dark:text-zinc-500">
                Creators and collectors helping shape what comes next.
              </p>
            </div>

            <h2 className="text-[15vw] xl:text-[12rem] 2xl:text-[14rem] leading-none font-extrabold tracking-tighter text-center whitespace-nowrap opacity-20 hover:opacity-100 transition-opacity duration-700 cursor-default select-none">
              DESPERSE
            </h2>
          </>
        )}

        <div className={`flex flex-col md:flex-row justify-between items-start md:items-end ${showCta ? 'mt-12 pt-12 border-t border-border' : ''}`}>
          <div className="space-y-4">
            <Link to="/privacy" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Terms of Service
            </Link>
            <Link to="/fees" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Fees
            </Link>
          </div>

          <div className="mt-8 md:mt-0 text-right">
            <div className="flex gap-6 mb-4 md:justify-end">
              <a href="https://x.com/DesperseApp" target="_blank" rel="noopener noreferrer" className="text-zinc-950 dark:text-zinc-50 hover:opacity-70">Twitter/X</a>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400/60 text-sm">© {new Date().getFullYear()} Desperse. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Main Landing Page Component
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-950 dark:text-zinc-50 scroll-smooth">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <StickyCards />
        <Gallery />
        <TechSpecs />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
