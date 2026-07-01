import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import {
	lookupFoundationCatalog,
	joinPreservationWaitlist,
} from '@/server/functions/preservation'
import { checkHandleAvailability } from '@/server/functions/auth'
import { Center, Row, Stack } from '@cdecaire/sable/layout'

type CatalogSuccess = Extract<
	Awaited<ReturnType<typeof lookupFoundationCatalog>>,
	{ pieces: unknown }
>

// Foundation shut down 2026-04-15. Pinata has stated a ~12-month grace
// window before pins begin lapsing — we count down to 2027-04-15.
const FOUNDATION_SHUTDOWN_ISO = '2026-04-15T00:00:00Z'
const PIN_EXPIRY_ISO = '2027-04-15T00:00:00Z'

// First-paint showcase. Loaded automatically on page mount so visitors
// see a populated catalog before they type anything.
const SHOWCASE_INPUT = 'sexafterflowers.eth'

// Cap the initially-rendered catalog. Foundation creators with deep catalogs
// (xcopy has 100+, sexafterflowers has 96) shouldn't blow out the page on
// first render. The "View all" expander surfaces the full set on demand.
const CATALOG_CAP = 24

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatUsd(amount: number): string {
	if (amount < 1) return `~$${amount.toFixed(2)}`
	if (amount < 100) return `~$${amount.toFixed(1)}`
	return `~$${Math.round(amount).toLocaleString()}`
}

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function daysUntil(iso: string): number {
	const target = new Date(iso).getTime()
	const now = Date.now()
	return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
}

function daysSince(iso: string): number {
	const start = new Date(iso).getTime()
	const now = Date.now()
	return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
}

function formatLongDate(d: Date): string {
	return d.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

/**
 * Returns a short, intentionally imprecise duration label. The pin-expiry
 * date is a 12-month estimate, not a published cutoff — showing "354 days
 * left" pretends we know the actual timeline. Coarser units convey the
 * shape of the urgency without false precision. Switches granularity
 * based on magnitude: days when close, weeks under two months, months
 * under two years, years beyond.
 */
function relaxedDuration(days: number): string {
	if (days <= 0) return 'now'
	if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`
	if (days < 60) {
		const weeks = Math.round(days / 7)
		return `~${weeks} weeks`
	}
	if (days < 730) {
		const months = Math.round(days / 30.4)
		return `~${months} months`
	}
	const years = Math.round(days / 365)
	return `~${years} ${years === 1 ? 'year' : 'years'}`
}

export function PreservationPage() {
	const { login, authenticated } = usePrivy()
	const { getAccessToken } = useAuth()
	const [input, setInput] = useState('')
	const [email, setEmail] = useState('')
	const [hasJoined, setHasJoined] = useState(false)
	const [emailExpanded, setEmailExpanded] = useState(false)
	const pendingPostSignupRef = useRef(false)
	const showcaseLoadedRef = useRef(false)

	// Live time-sensitive values. Initialized to null so SSR doesn't bake in
	// a server-side "now" that mismatches the client; populated on mount and
	// refreshed once per minute. Numbers/dates render once mounted.
	const [now, setNow] = useState<Date | null>(null)
	const [showAllPieces, setShowAllPieces] = useState(false)
	useEffect(() => {
		setNow(new Date())
		const t = setInterval(() => setNow(new Date()), 60_000)
		return () => clearInterval(t)
	}, [])

	const pinDaysLeft = now ? daysUntil(PIN_EXPIRY_ISO) : null
	const daysSinceShutdown = now ? daysSince(FOUNDATION_SHUTDOWN_ISO) : null
	const todayLong = now ? formatLongDate(now) : null

	const lookup = useMutation({
		mutationFn: async (addressOrEns: string) => {
			return await lookupFoundationCatalog({ data: { addressOrEns } } as never)
		},
	})

	const join = useMutation({
		mutationFn: async (vars: {
			email?: string
			ethAddress?: string
			catalogSnapshot?: unknown
			_authorization?: string | null
		}) => {
			return (await joinPreservationWaitlist({ data: vars } as never)) as {
				success: boolean
				error?: string
				alreadyJoined?: boolean
			}
		},
		onSuccess: (res) => {
			if (res.success) {
				setHasJoined(true)
				toastSuccess(res.alreadyJoined ? 'Already counted. Thanks!' : 'Vote counted. Thanks!')
			} else {
				toastError(res.error || 'Could not save your signup.')
			}
		},
		onError: () => toastError('Could not save your signup.'),
	})

	// Auto-load a showcase catalog on first paint so the page reads as a
	// living archive rather than a blank form. Only fires once.
	useEffect(() => {
		if (showcaseLoadedRef.current) return
		showcaseLoadedRef.current = true
		lookup.mutate(SHOWCASE_INPUT)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Reset the expand-all flag whenever a new lookup runs, so each catalog
	// starts in its capped state regardless of how the previous one was viewed.
	useEffect(() => {
		setShowAllPieces(false)
	}, [lookup.variables])

	const result = lookup.data
	const catalog: CatalogSuccess | null =
		result && 'pieces' in result ? (result as CatalogSuccess) : null
	const lookupError = result && 'error' in result ? (result as { error: string }).error : null
	const hasResult = lookup.isSuccess && (catalog !== null || lookupError !== null)
	const showWaitlist = hasResult && !hasJoined
	const isShowcase =
		lookup.isSuccess && lookup.variables === SHOWCASE_INPUT && input.trim() === ''

	const ethAddressFromInput = useMemo(() => {
		const cleaned = input.trim()
		return /^0x[a-fA-F0-9]{40}$/.test(cleaned) ? cleaned : null
	}, [input])

	const ensHandleSeed = useMemo(() => {
		if (!lookup.isSuccess) return null
		const cleaned = input.trim().toLowerCase()
		if (!/\.eth$/.test(cleaned)) return null
		return cleaned.replace(/\.eth$/, '')
	}, [input, lookup.isSuccess])

	const handlePreview = useQuery({
		queryKey: ['preservation', 'handle-preview', ensHandleSeed],
		queryFn: async () => {
			if (!ensHandleSeed) return null
			return (await checkHandleAvailability({
				data: { handle: ensHandleSeed },
			} as never)) as {
				success: boolean
				normalized?: string
				available?: boolean
				reason?: 'invalid'
			}
		},
		enabled: !!ensHandleSeed,
		staleTime: 30_000,
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = input.trim()
		if (!cleaned) return
		lookup.mutate(cleaned)
	}

	const catalogSnapshot = catalog
		? {
				pieceCount: catalog.stats.pieceCount,
				totalSizeBytes: catalog.stats.totalSizeBytes,
				firstMintAt: catalog.stats.firstMintAt,
			}
		: undefined

	const handleEmailJoin = (e: React.FormEvent) => {
		e.preventDefault()
		join.mutate({
			email: email.trim() || undefined,
			ethAddress: ethAddressFromInput || undefined,
			catalogSnapshot,
		})
	}

	const handleSignedInJoin = async () => {
		const token = await getAccessToken()
		join.mutate({
			_authorization: token,
			ethAddress: ethAddressFromInput || undefined,
			catalogSnapshot,
		})
	}

	const handleSignup = () => {
		pendingPostSignupRef.current = true
		login()
	}

	useEffect(() => {
		if (!authenticated || !pendingPostSignupRef.current) return
		pendingPostSignupRef.current = false
		;(async () => {
			const token = await getAccessToken()
			if (!token) return
			join.mutate({
				_authorization: token,
				ethAddress: ethAddressFromInput || undefined,
				catalogSnapshot,
			})
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authenticated])

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="pb-20">
				{/* Standalone masthead — replaces the global Desperse chrome on this
				    page. Brand mark, volume/issue, live countdown, theme toggle, exit
				    affordance. The page is its own self-contained marketing surface. */}
				<header className="border-b border-border/60 sticky top-0 z-(--z-nav) bg-background/85 backdrop-blur-md">
					<Row justify="between" align="center" gap={2} className="mx-auto max-w-6xl px-6 md:px-10 lg:px-12 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold">
						<Row align="center" gap={1.5} className="min-w-0">
							<Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0" aria-label="Desperse home">
								<Logo size={14} className="text-foreground" ariaHidden />
								<span className="text-foreground font-semibold">
									Desperse{' '}
									<span className="text-muted-foreground/60 mx-0.5">/</span> Preservation
								</span>
							</Link>
							<span className="hidden md:inline text-muted-foreground/60">·</span>
							<span className="hidden md:inline text-muted-foreground truncate">
								{todayLong ?? 'Vol. 01 · Foundation Archive'}
							</span>
						</Row>

						<Row align="center" gap={1.5} className="shrink-0">
							<div
								className="hidden sm:flex items-center gap-2 text-muted-foreground"
								suppressHydrationWarning
							>
								<span
									className="size-1.5 rounded-full bg-foreground motion-safe:animate-pulse"
									aria-hidden
								/>
								<span className="text-foreground">
									{pinDaysLeft != null ? relaxedDuration(pinDaysLeft) : '—'}
								</span>{' '}
								until pins lapse
							</div>
							<MastheadThemeToggle />
							<MastheadAuthAction />
						</Row>
					</Row>
					{/* Mobile-only countdown row — the masthead is too tight for it on
					    small viewports, so it gets its own line. */}
					<Row
						justify="between"
						align="center"
						gap={1.5}
						className="sm:hidden border-t border-border/60 px-6 py-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground"
						suppressHydrationWarning
					>
						<div className="flex items-center gap-2">
							<span
								className="size-1.5 rounded-full bg-foreground motion-safe:animate-pulse"
								aria-hidden
							/>
							<span className="text-foreground">
								{pinDaysLeft != null ? relaxedDuration(pinDaysLeft) : '—'} left
							</span>
						</div>
						{todayLong && <span className="truncate">{todayLong}</span>}
					</Row>
				</header>

				<Center max="72rem" className="px-6 md:px-10 lg:px-12">

					{/* Hero — bigger, editorial weight. Italic-style emphasis via muted
					    foreground on the second line. */}
					<section className="pt-16 md:pt-24 lg:pt-28 pb-12 md:pb-16 max-w-3xl">
						<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-6 flex items-center gap-3">
							<span className="block w-8 h-px bg-muted-foreground" aria-hidden />
							A preservation project · For Foundation creators
						</p>
						<h1 className="font-semibold tracking-[-0.035em] leading-[0.95] text-[clamp(2.75rem,8vw,6rem)] mb-8">
							Your work shouldn’t{' '}
							<span className="text-muted-foreground italic">vanish</span>
							<br />
							with the frontend.
						</h1>
						<p
							className="text-lg text-muted-foreground leading-[1.5] max-w-[60ch] mb-4"
							suppressHydrationWarning
						>
							Foundation shut down on April 15, 2026
							{daysSinceShutdown != null && daysSinceShutdown > 0 ? (
								<>
									{' '}— <span className="text-foreground">{relaxedDuration(daysSinceShutdown)} ago</span>
								</>
							) : null}
							. The IPFS pins keeping your art online are guaranteed for roughly twelve
							months. <span className="text-foreground">We haven’t built migration tools yet</span>{' '}
							— see what’s at risk for any wallet, and tell us if you’d want a
							Solana-native home for it on Desperse.
						</p>
					</section>
				</Center>

				{/* Lookup — sunken band so it reads as the input zone */}
				<div className="bg-card/40 border-y border-border/60 py-12 md:py-16">
					<Center max="48rem" className="px-6 md:px-10 lg:px-12">
						<Stack gap={2}>
						<form onSubmit={handleSubmit} className="space-y-3">
							<label
								htmlFor="lookup"
								className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block"
							>
								Enter the Ethereum address that minted your work
							</label>
							<div className="flex gap-2">
								<Input
									id="lookup"
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="0x… or yourname.eth"
									className="flex-1 bg-background border-border/60 rounded-sm px-4 h-12 text-base font-mono"
									autoComplete="off"
									spellCheck={false}
								/>
								<Button type="submit" size="cta" disabled={!input.trim() || lookup.isPending}>
									{lookup.isPending ? (
										<Icon name="spinner-third" variant="regular" spin />
									) : (
										'Preview catalog →'
									)}
								</Button>
							</div>
						</form>
						</Stack>
					</Center>
				</div>

				<Center max="72rem" className="px-6 md:px-10 lg:px-12 pt-12">
					<Stack gap={6}>
					{/* Result region — aria-live so SR users hear lookup outcomes */}
					<div role="status" aria-live="polite" aria-atomic="false" aria-busy={lookup.isPending}>
						{lookup.isPending && !catalog && (
							<Stack gap={3}>
								<div className="grid grid-cols-2 md:grid-cols-4 border border-border/60">
									{Array.from({ length: 4 }).map((_, i) => (
										<div
											key={i}
											className={`p-6 h-[120px] motion-safe:animate-pulse bg-card ${
												i < 3 ? 'border-r border-border/60' : ''
											} ${i < 2 ? 'border-b border-border/60 md:border-b-0' : ''}`}
										/>
									))}
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-px bg-border/60 border border-border/60">
									{Array.from({ length: 10 }).map((_, i) => (
										<div key={i} className="aspect-square bg-card motion-safe:animate-pulse" />
									))}
								</div>
								<p className="text-xs text-muted-foreground text-center font-semibold uppercase tracking-[0.08em]">
									Querying Ethereum · scanning mint events…
								</p>
							</Stack>
						)}

						{lookupError && (
							<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
								{lookupError}
							</div>
						)}

						{catalog && catalog.pieces.length === 0 && !lookupError && (
							<div className="rounded-lg border border-border/60 bg-card p-8 space-y-3 text-center">
								<div className="size-12 rounded-full bg-muted grid place-items-center mx-auto">
									<Icon name="magnifying-glass" variant="regular" className="text-muted-foreground" />
								</div>
								<p className="font-semibold text-lg">No pieces detected — yet.</p>
								<p className="text-sm text-muted-foreground max-w-md mx-auto">
									Coverage spans Foundation’s shared marketplace and self-deployed
									collection contracts, including pieces minted then sold. Some custom
									contracts may still be unrecognized — sign up below and we’ll alert
									you when your full catalog is detected.
								</p>
							</div>
						)}

						{catalog && catalog.pieces.length > 0 && (
							<Stack gap={6}>
								{isShowcase && (
									<p className="text-xs text-muted-foreground flex items-center gap-2">
										<span
											className="size-1.5 rounded-full bg-tone-standard motion-safe:animate-pulse shrink-0"
											aria-hidden
										/>
										<span>
											Showcase catalog —{' '}
											<span className="text-foreground font-mono">{SHOWCASE_INPUT}</span>
											. Look up your own wallet above to see what’s at risk.
										</span>
									</p>
								)}

								{/* Stats — restored newspaper-grid feel with thin borders + larger numerals */}
								<div className="grid grid-cols-2 md:grid-cols-4 border border-border/60">
									<StatCell
										label="Pieces"
										value={catalog.stats.pieceCount.toLocaleString()}
										borderRight
										borderBottom
									/>
									<StatCell
										label="Total size"
										value={formatBytes(catalog.stats.totalSizeBytes)}
										borderRight={false}
										borderRightMd
										borderBottom
									/>
									<StatCell
										label="Arweave cost"
										value={formatUsd(catalog.stats.estimatedArweaveCostUsd)}
										hint="approximate"
										borderRight
									/>
									<StatCell
										label="First mint"
										value={formatDate(catalog.stats.firstMintAt)}
									/>
								</div>

								{/* Catalog grid */}
								<Stack gap={2}>
									<Row justify="between" align="baseline" className="pb-3 border-b border-border/60">
										<h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
											The catalog
										</h2>
										<span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
											{catalog.pieces.length > CATALOG_CAP && !showAllPieces
												? `Showing ${CATALOG_CAP} of ${catalog.pieces.length}`
												: 'Hover for details'}
										</span>
									</Row>
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-px bg-border/60 border border-border/60">
										{(showAllPieces ? catalog.pieces : catalog.pieces.slice(0, CATALOG_CAP)).map((p) => (
											<a
												key={`${p.contract}-${p.tokenId}`}
												href={p.foundationUrl ?? '#'}
												target="_blank"
												rel="noreferrer noopener"
												aria-label={`${p.name ?? `Token ${p.tokenId}`} — open on Foundation`}
												className="group relative aspect-square bg-card overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
											>
												<PieceImage urls={p.imageUrls} alt={p.name ?? `Token ${p.tokenId}`} />
												<div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-zinc-950/85 to-transparent text-zinc-50 font-semibold text-[10px] uppercase tracking-wider flex justify-between items-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
													<span className="truncate max-w-[60%]">
														{p.name ?? `Token ${p.tokenId}`}
													</span>
													<span>{formatBytes(p.estimatedSizeBytes)}</span>
												</div>
											</a>
										))}
									</div>
									{catalog.pieces.length > CATALOG_CAP && (
										<Row justify="center" className="pt-2">
											<button
												type="button"
												onClick={() => setShowAllPieces((v) => !v)}
												className="text-sm px-4 min-h-10 inline-flex items-center gap-1.5 rounded-full border border-border/60 hover:border-border hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
											>
												{showAllPieces ? (
													<>
														Show fewer
														<Icon name="chevron-up" variant="regular" className="text-xs" />
													</>
												) : (
													<>
														View all {catalog.pieces.length} pieces
														<Icon name="chevron-down" variant="regular" className="text-xs" />
													</>
												)}
											</button>
										</Row>
									)}
									<p className="text-xs text-muted-foreground leading-relaxed pt-2">
										{catalog.limits.message}
									</p>
								</Stack>

								{/* ENS handle preview */}
								{ensHandleSeed && (
									<HandlePreview
										seed={ensHandleSeed}
										data={handlePreview.data ?? null}
										isLoading={handlePreview.isFetching}
									/>
								)}
							</Stack>
						)}
					</div>
					</Stack>
				</Center>

				{/* Trust section — comes BEFORE pricing because creators leaving a
				    platform that just shut down need to feel safe before they care
				    about cost. "Yours, not ours." answers their fear; pricing answers
				    their question. */}
				{hasResult && catalog && catalog.pieces.length > 0 && (
					<div className="bg-card/40 border-y border-border/60 mt-16 py-16">
						<Center max="72rem" className="px-6 md:px-10 lg:px-12">
							<Stack gap={6}>
							<Stack gap={1.5} className="max-w-2xl">
								<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Why this is different
								</p>
								<h2 className="font-semibold tracking-[-0.025em] leading-[1.05] text-[clamp(2rem,5vw,3.5rem)]">
									Yours, not ours.
								</h2>
								<p className="text-base text-muted-foreground leading-relaxed">
									Foundation took the website with it. The art didn’t disappear, but
									the IPFS pins started a 12-month clock toward expiration. Here’s
									how this is designed so the same thing can’t happen if Desperse
									ever goes away.
								</p>
							</Stack>

							<div className="grid md:grid-cols-3 gap-px bg-border/60 border border-border/60">
								<Pillar
									number="01"
									title="You mint, you own"
									body="Each piece mints straight into your Solana wallet, signed by you. If Desperse disappears, your NFTs are still on-chain — viewable in any Solana wallet app, verifiable by anyone. We never hold your work, and there’s no kill switch we control."
								/>
								<Pillar
									number="02"
									title="Pay once, stored ~200 years"
									body="Arweave isn’t a subscription. About $5 per GB, paid once. The network bakes a 200-year storage budget into every upload, so files persist whether or not anyone keeps paying. Foundation’s pins were a Pinata subscription that had to be renewed — that’s why they have a 12-month expiration. Arweave doesn’t have that risk."
								/>
								<Pillar
									number="03"
									title="Claims go wallet-to-wallet"
									body="When your past collectors claim their preservation copy, the new NFT lands directly in their Solana wallet — they sign with their own wallet to receive it. We just run the matching; we never hold anything. They own theirs the same way you own yours."
								/>
							</div>

							{/* Storage comparison */}
							<Stack gap={2.5} className="pt-4">
								<Stack gap={1} className="max-w-2xl">
									<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
										Storage compared
									</p>
									<h3 className="text-xl md:text-2xl font-semibold tracking-tight">
										Different cost models, different reliability stories.
									</h3>
								</Stack>
								<div className="grid md:grid-cols-2 gap-px bg-border/60 border border-border/60">
									<StorageCard
										label="What Foundation used"
										title="IPFS pinning"
										subtitle="Pinata, Web3.Storage, etc."
										points={[
											{ k: 'Pricing', v: 'Subscription · ~$20/mo per 50GB' },
											{ k: 'Persistence', v: 'Lasts as long as someone keeps paying' },
											{ k: 'If the platform leaves', v: 'Files start expiring' },
											{ k: 'Foundation’s outcome', v: '~12 months before files lapse' },
										]}
									/>
									<StorageCard
										label="What we’d use"
										title="Arweave"
										subtitle="Permanent · pay once"
										points={[
											{ k: 'Pricing', v: '$5–10 per GB · paid once' },
											{ k: 'Persistence', v: '~200 years — paid for upfront by the upload' },
											{ k: 'If the platform leaves', v: 'No effect — files don’t depend on us' },
											{ k: 'Best for', v: 'Anything you want to outlive a frontend' },
										]}
									/>
								</div>
								<p className="text-xs text-muted-foreground max-w-3xl pt-1">
									Arweave isn’t free — cost scales with file size, and 200 years is a
									protocol projection, not a legal guarantee. But it’s one-time, not
									recurring, and your files don’t depend on any single company.
								</p>
							</Stack>
							</Stack>
						</Center>
					</div>
				)}

				{/* Pricing — what we'd build, with two tier shapes + a worked example
				    tied to the user's actual catalog. Sits between trust (which de-risks)
				    and "what happens next" (which sets expectations). */}
				{hasResult && catalog && catalog.pieces.length > 0 && (
					<div className="bg-background py-16">
						<Center max="72rem" className="px-6 md:px-10 lg:px-12">
							<Stack gap={5}>
							<Stack gap={1.5} className="max-w-2xl">
								<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									If we build it
								</p>
								<h2 className="font-semibold tracking-[-0.025em] leading-[1.05] text-[clamp(2rem,5vw,3.5rem)]">
									Two shapes we’re considering.
								</h2>
								<p className="text-base text-muted-foreground leading-relaxed">
									Nothing here is built yet. These are the two directions we’d explore
									if enough creators sign up below.
								</p>
							</Stack>

							<div className="grid md:grid-cols-2 gap-px bg-border/60 border border-border/60">
								<TierCard
									label="Idea · free for migrators"
									title="Preservation edition"
									desc="A lightweight Solana mint with your media on permanent Arweave storage, verifiably linked to your original Foundation mint. Past collectors could claim a free copy with a wallet signature."
									points={[
										'Permanent Arweave storage',
										'Verifiable link back to your original mint',
										'Past collectors could claim with a wallet signature',
										'Pennies per piece (mostly Arweave) — possibly subsidized for early migrators',
									]}
									highlight={false}
								/>
								<TierCard
									label="Idea · for royalty-earning catalogs"
									title="Premium edition"
									desc="A first-class Solana NFT with on-chain royalties. Would be listable on secondary marketplaces, with royalties enforced at the protocol level."
									points={[
										'Permanent Arweave storage',
										'On-chain royalties — you set the rate',
										'Listable on Magic Eden, Tensor, etc.',
										'~$1–2 per piece (Solana mint + storage) — would be paid by you',
									]}
									highlight
								/>
							</div>

							{/* Worked example using the user's actual catalog */}
							<Stack gap={1.5} className="rounded-lg border border-border/60 bg-card p-6">
								<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Hypothetical · your catalog above
								</p>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<MiniStat
										label="Pieces"
										value={catalog.stats.pieceCount.toLocaleString()}
									/>
									<MiniStat
										label="Preservation"
										value={formatUsd(catalog.stats.estimatedArweaveCostUsd)}
										hint="Storage only"
									/>
									<MiniStat
										label="Premium"
										value={formatUsd(
											catalog.stats.estimatedArweaveCostUsd + catalog.stats.pieceCount * 0.6,
										)}
										hint="Storage + Solana mint"
									/>
									<MiniStat
										label="If subsidized"
										value="$0"
										hint="Possible · TBD"
									/>
								</div>
								<p className="text-xs text-muted-foreground pt-1">
									Illustrative numbers — we haven’t built this. Real costs would
									depend on file sizes, SOL price, Arweave storage rates, and which
									shape we land on (if any).
								</p>
							</Stack>
							</Stack>
						</Center>
					</div>
				)}

				{/* Signup / waitlist */}
				<div className="bg-background pt-20 pb-12">
					<Center max="48rem" className="px-6 md:px-10 lg:px-12 text-center">
						<Stack gap={3}>
						<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
							Show interest
						</p>
						<h2 className="font-semibold tracking-[-0.025em] leading-[1.05] text-[clamp(2rem,5vw,3.5rem)]">
							Tell us you’d{' '}
							<span className="text-muted-foreground italic">use this</span>.
						</h2>
						<p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
							Your signup is a vote. If enough Foundation creators sign up, we’ll
							build the migration tool. If not, we won’t — and we won’t spam you
							either way. No promises on timeline, scope, pricing, or whether this
							happens at all.
						</p>

						{showWaitlist && authenticated && (
							<div className="pt-4">
								<Button onClick={handleSignedInJoin} disabled={join.isPending} size="cta">
									{join.isPending ? (
										<Icon name="spinner-third" variant="regular" spin />
									) : (
										'I’d use this — count me in'
									)}
								</Button>
								<p className="text-xs text-muted-foreground mt-3">
									Signed in to Desperse — we’ll only contact you if this turns into something real.
								</p>
							</div>
						)}

						{showWaitlist && !authenticated && (
							<div className="pt-4 space-y-4">
								<Button onClick={handleSignup} size="cta">
									Sign up to vote yes
								</Button>
								{ensHandleSeed && (
									<p className="text-xs text-muted-foreground">
										You’ll set up{' '}
										<span className="font-mono text-foreground">@{ensHandleSeed}</span>{' '}
										during signup, subject to availability.
									</p>
								)}
								<div className="pt-2">
									{!emailExpanded ? (
										<button
											type="button"
											onClick={() => setEmailExpanded(true)}
											className="text-sm px-4 min-h-10 inline-flex items-center gap-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
										>
											Just want updates? Email-only signup
											<Icon name="arrow-right" variant="regular" className="text-xs" />
										</button>
									) : (
										<form onSubmit={handleEmailJoin} className="space-y-2 max-w-md mx-auto pt-2 border-t border-border/60">
											<label
												htmlFor="waitlist-email"
												className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block pt-3"
											>
												Email-only — no account
											</label>
											<div className="flex flex-col sm:flex-row gap-2">
												<Input
													id="waitlist-email"
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													placeholder="you@example.com"
													className="flex-1 bg-card border-border/60 rounded-sm px-4 h-10 text-sm"
													autoComplete="email"
													required
												/>
												<Button type="submit" variant="outline" disabled={join.isPending}>
													{join.isPending ? (
														<Icon name="spinner-third" variant="regular" spin />
													) : (
														'Join the list'
													)}
												</Button>
											</div>
										</form>
									)}
								</div>
							</div>
						)}

						{hasJoined && (
							<div className="pt-4 max-w-md mx-auto rounded-lg border border-border/60 bg-card p-6 flex items-start gap-3 text-left">
								<div className="size-9 rounded-full bg-tone-standard/15 grid place-items-center shrink-0">
									<Icon name="check" variant="regular" className="text-tone-standard" />
								</div>
								<div className="space-y-1">
									<p className="font-semibold">Vote counted.</p>
									<p className="text-sm text-muted-foreground">
										We’ll only follow up if this becomes a real product. Thanks
										for helping us figure out whether to build it.
									</p>
								</div>
							</div>
						)}
						</Stack>
					</Center>
				</div>

				{/* Footnote — single line. Trust section already covers custody. */}
				<Center max="48rem" className="px-6 md:px-10 lg:px-12 pt-12 pb-16 text-center">
					<p className="text-xs text-muted-foreground leading-relaxed max-w-[65ch] mx-auto">
						An interest check, not a product. If we build the migration tool, your
						Ethereum originals stay on Ethereum and Desperse never holds them.
					</p>
				</Center>

				{/* Colophon — standalone footer for this page. Editorial signoff
				    + minimal nav back to the rest of Desperse. */}
				<footer className="border-t border-border/60 mt-8">
					<div className="mx-auto max-w-6xl px-6 md:px-10 lg:px-12 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
						<div className="flex items-center gap-2">
							<Logo size={11} className="text-muted-foreground" ariaHidden />
							<span>Desperse · Creator-first preservation · Interest check</span>
						</div>
						<nav className="flex items-center gap-5" aria-label="Footer">
							<Link to="/" className="hover:text-foreground transition-colors">
								Home
							</Link>
							<Link to="/about" className="hover:text-foreground transition-colors">
								About
							</Link>
							<Link to="/privacy" className="hover:text-foreground transition-colors">
								Privacy
							</Link>
							<Link to="/terms" className="hover:text-foreground transition-colors">
								Terms
							</Link>
						</nav>
					</div>
				</footer>
			</main>
		</div>
	)
}

/**
 * Theme toggle baked into the standalone masthead — replaces the chunky
 * Switch from the global PublicHeader with a single icon button so it sits
 * cleanly alongside the brand mark.
 */
function MastheadThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme()
	const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark'
	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
			aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
			className="size-10 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
		>
			<Icon name={isDark ? 'moon' : 'sun-bright'} variant="regular" className="text-sm" />
		</button>
	)
}

/**
 * Authenticated-only exit affordance: "Feed →" link back to the rest of
 * Desperse. Anonymous users have no masthead button — signup happens via
 * the in-page primary CTA, which avoids a competing "Log in" button that
 * could siphon clicks away from the vote.
 */
function MastheadAuthAction() {
	const { authenticated } = usePrivy()
	if (!authenticated) return null
	return (
		<Link
			to="/"
			className="text-sm normal-case tracking-normal font-medium px-4 min-h-10 inline-flex items-center gap-1.5 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
		>
			Feed
			<Icon name="arrow-right" variant="regular" className="text-xs" />
		</Link>
	)
}

function StatCell({
	label,
	value,
	hint,
	borderRight,
	borderRightMd,
	borderBottom,
}: {
	label: string
	value: string
	hint?: string
	borderRight?: boolean
	borderRightMd?: boolean
	borderBottom?: boolean
}) {
	return (
		<div
			className={`bg-card p-6 md:p-8 space-y-3 ${
				borderRight ? 'border-r border-border/60' : ''
			} ${borderRightMd ? 'md:border-r border-border/60' : ''} ${
				borderBottom ? 'border-b md:border-b-0 border-border/60' : ''
			}`}
		>
			<div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</div>
			<div className="text-3xl md:text-4xl font-semibold tabular-nums tracking-[-0.02em]">
				{value}
			</div>
			{hint && <div className="text-[10px] font-semibold text-muted-foreground">{hint}</div>}
		</div>
	)
}

function TierCard({
	label,
	title,
	subtitle,
	desc,
	points,
	highlight,
}: {
	label: string
	title: string
	subtitle?: string
	desc: string
	points: string[]
	highlight: boolean
}) {
	return (
		<div className="bg-card p-6 md:p-8 space-y-4">
			<div className="flex items-center gap-2 flex-wrap">
				<div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					{label}
				</div>
				{highlight && (
					<span className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-tone-edition/15 text-tone-edition">
						Royalties
					</span>
				)}
			</div>
			<div className="space-y-1">
				<h3 className="text-xl font-semibold tracking-tight">{title}</h3>
				{subtitle && (
					<p className="text-xs text-muted-foreground">
						{subtitle}
					</p>
				)}
			</div>
			<p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
			<ul className="space-y-2 pt-2">
				{points.map((p) => (
					<li key={p} className="text-sm flex items-start gap-2">
						<span className="text-muted-foreground mt-1.5 size-1 rounded-full bg-muted-foreground shrink-0" />
						<span>{p}</span>
					</li>
				))}
			</ul>
		</div>
	)
}

function Pillar({
	number,
	title,
	body,
}: {
	number: string
	title: string
	body: string
}) {
	return (
		<div className="bg-card p-6 md:p-8 space-y-4">
			<div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground tabular-nums">
				{number}
			</div>
			<h3 className="text-xl font-semibold tracking-tight">{title}</h3>
			<p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
		</div>
	)
}

function StorageCard({
	label,
	title,
	subtitle,
	points,
}: {
	label: string
	title: string
	subtitle?: string
	points: Array<{ k: string; v: string }>
}) {
	return (
		<div className="bg-card p-6 md:p-8 space-y-4">
			<div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</div>
			<div className="space-y-1">
				<h4 className="text-xl font-semibold tracking-tight">{title}</h4>
				{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
			</div>
			<dl className="space-y-2 pt-2 border-t border-border/60">
				{points.map((p) => (
					<div
						key={p.k}
						className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 pt-2 text-sm"
					>
						<dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:w-32 shrink-0">
							{p.k}
						</dt>
						<dd className="text-foreground">{p.v}</dd>
					</div>
				))}
			</dl>
		</div>
	)
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="space-y-1">
			<div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</div>
			<div className="text-xl md:text-2xl font-semibold tabular-nums">{value}</div>
			{hint && <div className="text-[10px] font-semibold text-muted-foreground">{hint}</div>}
		</div>
	)
}

/**
 * Tries each URL in `urls` in turn. On <img> error, advances to the next
 * candidate. Falls back to a "No preview" placeholder when all fail.
 * Necessary because Alchemy responses mix CDN, IPFS, and Arweave URLs and
 * any single source can transiently 404 or rate-limit.
 */
function PieceImage({ urls, alt }: { urls: string[]; alt: string }) {
	const [index, setIndex] = useState(0)
	const [failed, setFailed] = useState(false)
	const current = urls[index]

	if (!current || failed) {
		return (
			<div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
				No preview
			</div>
		)
	}

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={current}
			alt={alt}
			className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
			loading="lazy"
			onError={() => {
				if (index + 1 < urls.length) setIndex(index + 1)
				else setFailed(true)
			}}
		/>
	)
}

function HandlePreview({
	seed,
	data,
	isLoading,
}: {
	seed: string
	data: { success: boolean; normalized?: string; available?: boolean; reason?: 'invalid' } | null
	isLoading: boolean
}) {
	const normalized = data?.normalized ?? seed
	const available = data?.available
	const isInvalid = data?.reason === 'invalid'

	let status: 'loading' | 'available' | 'taken' | 'invalid'
	if (isLoading || !data) status = 'loading'
	else if (isInvalid) status = 'invalid'
	else if (available) status = 'available'
	else status = 'taken'

	return (
		<div className="rounded-lg border border-border/60 bg-card p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
			<div className="flex items-center gap-2 min-w-0">
				<span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
					Suggested handle
				</span>
				<span className="font-mono text-sm truncate">@{normalized}</span>
			</div>
			<div className="ml-auto flex items-center gap-2 text-xs" role="status" aria-live="polite">
				{status === 'loading' && (
					<span className="text-muted-foreground flex items-center gap-1.5">
						<Icon name="spinner-third" variant="regular" spin />
						Checking…
					</span>
				)}
				{status === 'available' && (
					<span className="text-tone-standard flex items-center gap-1.5 font-medium">
						<Icon name="check" variant="regular" />
						Available · subject to signup
					</span>
				)}
				{status === 'taken' && (
					<span className="text-muted-foreground">Taken — pick a new one at signup</span>
				)}
				{status === 'invalid' && (
					<span className="text-muted-foreground">Pick a new one at signup</span>
				)}
			</div>
		</div>
	)
}
