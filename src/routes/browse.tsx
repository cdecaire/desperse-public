/**
 * Browse Page
 * Public gallery view of recent posts — no auth required
 * Standalone layout (no app shell) matching landing/static pages
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useRef } from 'react'
import { getTrendingPosts } from '@/server/functions/explore'
import { getOptimizedImageUrl } from '@/lib/imageUrl'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { Icon } from '@/components/ui/icon'
import { Logo } from '@/components/shared/Logo'
import { Footer } from '@/components/landing/LandingPage'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Switch } from '@/components/ui/switch'

const BROWSE_LIMIT = 15

type BrowsePost = {
	id: string
	mediaUrl: string
	coverUrl: string | null
	caption: string | null
	type?: string
	likeCount?: number
	collectCount?: number
	purchaseCount?: number
	user?: {
		id: string
		displayName: string | null
		usernameSlug: string
		avatarUrl: string | null
	}
}

export const Route = createFileRoute('/browse')({
	component: BrowsePage,
})

function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'other' {
	const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
	if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || ''))
		return 'image'
	if (['mp4', 'webm', 'mov'].includes(extension || '')) return 'video'
	if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'audio'
	return 'other'
}

function BrowseMediaThumbnail({
	post,
	className = '',
}: {
	post: BrowsePost
	className?: string
}) {
	const mediaType = detectMediaType(post.mediaUrl)
	const displayUrl =
		post.coverUrl ?? (mediaType === 'image' ? post.mediaUrl : null)

	if (displayUrl) {
		return (
			<img
				src={getOptimizedImageUrl(displayUrl, { width: 480, quality: 75 })}
				alt={post.caption ?? 'Post'}
				loading="lazy"
				decoding="async"
				className={className}
			/>
		)
	}

	if (mediaType === 'video') {
		return (
			<video
				src={post.mediaUrl}
				muted
				autoPlay
				loop
				playsInline
				className={className}
			/>
		)
	}

	if (mediaType === 'audio') {
		return (
			<div
				className={`flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 ${className}`}
			>
				<Icon
					name="music"
					variant="regular"
					className="text-4xl text-muted-foreground/50"
				/>
			</div>
		)
	}

	return (
		<div
			className={`flex items-center justify-center bg-muted ${className}`}
		>
			<Icon
				name="file"
				variant="regular"
				className="text-4xl text-muted-foreground/50"
			/>
		</div>
	)
}

function BrowseHeader() {
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
						className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all duration-300 disabled:opacity-50"
					>
						Log in or Sign up
					</button>
				)}
			</div>
		</header>
	)
}

// Scroll-triggered reveal observer — reuses landing page pattern
// Uses MutationObserver to pick up elements that render after initial mount (e.g. CTA)
function useRevealObserver() {
	useEffect(() => {
		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

		const observeElement = (el: Element) => {
			if (prefersReduced) {
				el.classList.add('active')
			} else {
				io.observe(el)
			}
		}

		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('active')
						io.unobserve(entry.target)
					}
				})
			},
			{ threshold: 0.08 }
		)

		// Observe existing elements
		document.querySelectorAll('.browse-reveal').forEach(observeElement)

		// Watch for new .browse-reveal elements added to the DOM
		const mo = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement) {
						if (node.classList.contains('browse-reveal')) observeElement(node)
						node.querySelectorAll('.browse-reveal').forEach(observeElement)
					}
				}
			}
		})
		mo.observe(document.body, { childList: true, subtree: true })

		return () => {
			io.disconnect()
			mo.disconnect()
		}
	}, [])
}

// Stagger cards once data loads
function useCardStagger(hasData: boolean) {
	const gridRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!hasData || !gridRef.current) return
		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		if (prefersReduced) {
			gridRef.current.querySelectorAll('.browse-card').forEach((el) => {
				(el as HTMLElement).style.opacity = '1'
				;(el as HTMLElement).style.transform = 'none'
			})
			return
		}

		const cards = gridRef.current.querySelectorAll('.browse-card')
		// Trigger stagger after a microtask so initial styles apply first
		requestAnimationFrame(() => {
			cards.forEach((card, i) => {
				const el = card as HTMLElement
				el.style.transitionDelay = `${i * 60}ms`
				el.classList.add('active')
			})
		})
	}, [hasData])

	return gridRef
}

function BrowsePage() {
	const { login, ready, authenticated } = usePrivy()

	const { data, isLoading } = useQuery({
		queryKey: ['browse-posts'],
		queryFn: async () => {
			const result = await getTrendingPosts({
				data: { limit: BROWSE_LIMIT, offset: 0 },
			} as never)
			return result
		},
		staleTime: 1000 * 60 * 5,
	})

	const posts = (data?.posts ?? []) as BrowsePost[]
	const gridRef = useCardStagger(posts.length > 0)
	useRevealObserver()

	return (
		<div className="min-h-screen bg-background text-zinc-950 dark:text-zinc-50 flex flex-col">
			<BrowseHeader />

			{/* Page content */}
			<main className="flex-1 pt-24 pb-10">
				{/* Title section */}
				<div className="max-w-7xl mx-auto px-6 mb-10 browse-reveal">
					<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
						Browse
					</h1>
					<p className="text-muted-foreground mt-2">
						Recent work from creators on Desperse
					</p>
				</div>

				{/* Gallery Grid */}
				<div className="max-w-7xl mx-auto px-6">
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className="aspect-4/5 rounded-xl overflow-hidden browse-skeleton"
									style={{ animationDelay: `${i * 150}ms` }}
								/>
							))}
						</div>
					) : posts.length > 0 ? (
						<div
							ref={gridRef}
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
						>
							{posts.map((post) => (
								<Link
									key={post.id}
									to="/post/$postId"
									params={{ postId: post.id }}
									className="browse-card group relative aspect-4/5 bg-muted rounded-xl overflow-hidden"
								>
									<BrowseMediaThumbnail
										post={post}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
									/>

									{/* Hover overlay */}
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

									{/* Bottom info — always visible on mobile, hover on desktop */}
									<div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent max-sm:opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
										<p className="font-bold text-white truncate mb-1.5">
											{post.caption || 'Untitled'}
										</p>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 min-w-0">
												{post.user?.avatarUrl ? (
													<OptimizedImage
														src={post.user.avatarUrl}
														alt={
															post.user.displayName ||
															post.user.usernameSlug
														}
														width={320}
														className="w-5 h-5 rounded-full object-cover shrink-0"
														fadeIn={false}
													/>
												) : (
													<div className="w-5 h-5 rounded-full bg-zinc-600 flex items-center justify-center shrink-0">
														<span className="text-[10px] text-white font-medium">
															{post.user?.usernameSlug
																?.charAt(0)
																.toUpperCase() || '?'}
														</span>
													</div>
												)}
												<p className="text-sm text-zinc-300 truncate">
													@{post.user?.usernameSlug}
												</p>
											</div>
											<div className="flex items-center gap-3 text-zinc-300 shrink-0 ml-3">
												{(post.likeCount ?? 0) > 0 && (
													<span className="flex items-center gap-1 text-xs">
														<Icon name="heart" variant="solid" className="text-[10px]" />
														{post.likeCount}
													</span>
												)}
												{((post.collectCount ?? 0) + (post.purchaseCount ?? 0)) > 0 && (
													<span className="flex items-center gap-1 text-xs">
														<Icon name={post.type === 'edition' ? 'image-stack' : 'gem'} variant="solid" className="text-[10px]" />
														{(post.collectCount ?? 0) + (post.purchaseCount ?? 0)}
													</span>
												)}
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<div className="text-center py-20 browse-reveal">
							<div className="browse-float inline-block mb-4">
								<Icon
									name="images"
									variant="regular"
									className="text-4xl text-muted-foreground"
								/>
							</div>
							<p className="text-muted-foreground">No posts yet</p>
						</div>
					)}
				</div>
			</main>

			{/* CTA Section — only for unauthenticated users */}
			{!authenticated && posts.length > 0 && (
				<section className="border-t border-border/50 bg-card/30 browse-reveal">
					<div className="max-w-2xl mx-auto px-6 py-20 text-center">
						<h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
							See more on Desperse
						</h2>
						<p className="text-muted-foreground mb-8 max-w-md mx-auto">
							Sign up to explore the full feed, collect digital art, and
							support your favorite creators.
						</p>
						<button
							onClick={() => login()}
							disabled={!ready}
							className="browse-cta-btn px-10 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full text-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
						>
							Get Started — It's Free
						</button>
					</div>
				</section>
			)}

			<Footer showCta={false} />
			<BrowseAnimationStyles />
		</div>
	)
}

function BrowseAnimationStyles() {
	return (
		<style>{`
			/* Scroll reveal — matches landing page easing */
			.browse-reveal {
				opacity: 0;
				transform: translateY(20px);
				transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
				            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
			}
			.browse-reveal.active {
				opacity: 1;
				transform: translateY(0);
			}

			/* Card stagger entrance */
			.browse-card {
				opacity: 0;
				transform: translateY(24px) scale(0.97);
				transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
				            transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
				            box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
			}
			.browse-card.active {
				opacity: 1;
				transform: translateY(0) scale(1);
			}

			/* Card hover lift */
			.browse-card:hover {
				box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.3);
				transform: translateY(-4px) scale(1) !important;
			}

			/* Skeleton shimmer */
			.browse-skeleton {
				background: linear-gradient(
					110deg,
					hsl(var(--muted)) 30%,
					hsl(var(--muted) / 0.5) 50%,
					hsl(var(--muted)) 70%
				);
				background-size: 200% 100%;
				animation: browse-shimmer 1.8s ease-in-out infinite;
			}

			@keyframes browse-shimmer {
				0% { background-position: 200% 0; }
				100% { background-position: -200% 0; }
			}

			/* Empty state float */
			.browse-float {
				animation: browse-float 3s ease-in-out infinite;
			}

			@keyframes browse-float {
				0%, 100% { transform: translateY(0); }
				50% { transform: translateY(-6px); }
			}

			/* CTA button subtle glow on hover */
			.browse-cta-btn {
				position: relative;
			}
			.browse-cta-btn::after {
				content: '';
				position: absolute;
				inset: -1px;
				border-radius: 9999px;
				opacity: 0;
				background: radial-gradient(
					ellipse at center,
					hsl(var(--muted) / 0.4) 0%,
					transparent 70%
				);
				transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
				z-index: -1;
				filter: blur(12px);
			}
			.browse-cta-btn:hover::after {
				opacity: 1;
			}

			/* Reduced motion */
			@media (prefers-reduced-motion: reduce) {
				.browse-reveal,
				.browse-card {
					opacity: 1;
					transform: none;
					transition: none;
				}
				.browse-card:hover {
					transform: none !important;
					box-shadow: none;
				}
				.browse-skeleton {
					animation: none;
					background: hsl(var(--muted));
				}
				.browse-float {
					animation: none;
				}
			}
		`}</style>
	)
}
