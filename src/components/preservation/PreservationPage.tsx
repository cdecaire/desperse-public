import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { useAuth } from '@/hooks/useAuth'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Footer } from '@/components/landing/LandingPage'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { toastError, toastSuccess } from '@/lib/toast'
import {
	lookupFoundationCatalog,
	joinPreservationWaitlist,
} from '@/server/functions/preservation'
import { checkHandleAvailability } from '@/server/functions/auth'

type CatalogSuccess = Extract<
	Awaited<ReturnType<typeof lookupFoundationCatalog>>,
	{ pieces: unknown }
>

const DEMO_CHIPS = [
	{ label: 'jerryz.eth', value: 'jerryz.eth' },
	{ label: 'pplpleasr.eth', value: 'pplpleasr.eth' },
	{ label: 'xcopy.eth', value: 'xcopy.eth' },
]

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

export function PreservationPage() {
	const { login, authenticated } = usePrivy()
	const { getAccessToken } = useAuth()
	const [input, setInput] = useState('')
	const [email, setEmail] = useState('')
	const [hasJoined, setHasJoined] = useState(false)
	const [emailExpanded, setEmailExpanded] = useState(false)
	const pendingPostSignupRef = useRef(false)

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
				toastSuccess(res.alreadyJoined ? 'Already on the list — we’ll be in touch.' : 'You’re on the list.')
			} else {
				toastError(res.error || 'Could not save your signup.')
			}
		},
		onError: () => toastError('Could not save your signup.'),
	})

	const result = lookup.data
	const catalog: CatalogSuccess | null =
		result && 'pieces' in result ? (result as CatalogSuccess) : null
	const lookupError = result && 'error' in result ? (result as { error: string }).error : null
	const hasResult = lookup.isSuccess && (catalog !== null || lookupError !== null)
	const showWaitlist = hasResult && !hasJoined

	const ethAddressFromInput = useMemo(() => {
		const cleaned = input.trim()
		return /^0x[a-fA-F0-9]{40}$/.test(cleaned) ? cleaned : null
	}, [input])

	// If the lookup was an ENS name (e.g. xcopy.eth), suggest the prefix as a
	// possible Desperse handle and check availability live. Display only — the
	// real handle is chosen during normal signup; nothing is reserved here.
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

	const handleChip = (value: string) => {
		setInput(value)
		lookup.mutate(value)
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
		// Set a flag so we auto-tag preservation interest as soon as the Privy
		// modal closes with a successful login. Avoids a second click.
		pendingPostSignupRef.current = true
		login()
	}

	// After Privy login succeeds, write the preservation row tagged with the
	// new userId so this signup is linked to their Desperse account from day one.
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
			<PublicHeader />

			<main className="pt-24 pb-20 px-6">
				<div className="mx-auto max-w-3xl space-y-12">
					{/* Hero */}
					<section className="space-y-6">
						<p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
							Foundation preservation · prototype
						</p>
						<h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]">
							Foundation went quiet. Your work doesn’t have to.
						</h1>
						<p className="text-base text-muted-foreground leading-relaxed max-w-[60ch]">
							Foundation’s marketplace shut down on April 15. There’s a roughly 12-month
							window before pinned IPFS metadata starts to lapse. Look up a wallet to see
							what’s at risk — and bring your catalog to a Solana-native home built for creators.
						</p>
					</section>

					{/* Lookup */}
					<section className="space-y-3">
						<form onSubmit={handleSubmit} className="space-y-3">
							<label
								htmlFor="lookup"
								className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground block"
							>
								Look up a catalog
							</label>
							<div className="flex gap-2">
								<input
									id="lookup"
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="0x… or alice.eth"
									className="flex-1 bg-card border border-border/60 rounded-sm px-4 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-border font-mono"
									autoComplete="off"
									spellCheck={false}
								/>
								<Button type="submit" disabled={!input.trim() || lookup.isPending}>
									{lookup.isPending ? (
										<Icon name="spinner-third" variant="regular" spin />
									) : (
										'Look up'
									)}
								</Button>
							</div>
							<div className="flex flex-wrap gap-2 items-center pt-1">
								<span className="text-xs text-muted-foreground mr-1">Try:</span>
								{DEMO_CHIPS.map((chip) => (
									<button
										key={chip.value}
										type="button"
										onClick={() => handleChip(chip.value)}
										className="text-sm px-3 py-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-mono min-h-10"
									>
										{chip.label}
									</button>
								))}
							</div>
						</form>
					</section>

					{/* Result region — aria-live so SR users hear lookup outcomes.
					    Branches below are mutually exclusive so wrapping doesn't cause spacing issues. */}
					<div role="status" aria-live="polite" aria-atomic="false">
					{/* Loading skeleton — shown during the (sometimes multi-second) Alchemy
					    cascade. Lookup fans out across mint events + contract metadata + batch
					    NFT metadata, so we surface a skeleton rather than a blank page. */}
					{lookup.isPending && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								{Array.from({ length: 4 }).map((_, i) => (
									<div
										key={i}
										className="rounded-lg bg-card border border-border/60 p-4 h-[88px] animate-pulse"
									/>
								))}
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<div
										key={i}
										className="aspect-square rounded-lg bg-card border border-border/60 animate-pulse"
									/>
								))}
							</div>
							<p className="text-xs text-muted-foreground text-center">
								Resolving wallet, scanning mint events, fetching catalog metadata…
							</p>
						</div>
					)}

					{/* Error */}
					{lookupError && (
						<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
							{lookupError}
						</div>
					)}

					{/* Empty result — still encourage signup */}
					{catalog && catalog.pieces.length === 0 && !lookupError && (
						<div className="rounded-lg border border-border/60 bg-card p-6 space-y-3">
							<div className="flex items-start gap-3">
								<div className="size-9 rounded-full bg-muted grid place-items-center shrink-0">
									<Icon name="magnifying-glass" variant="regular" className="text-muted-foreground" />
								</div>
								<div className="space-y-1">
									<p className="font-semibold">No pieces detected — yet.</p>
									<p className="text-sm text-muted-foreground">
										Coverage now spans Foundation’s shared marketplace and self-deployed
										collection contracts, including pieces minted then sold. Some custom
										contracts may still be unrecognized — sign up below and we’ll alert
										you when your full catalog is detected.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Result with pieces */}
					{catalog && catalog.pieces.length > 0 && (
						<div className="space-y-8">
							{/* Stats */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								<StatCell label="Pieces" value={catalog.stats.pieceCount.toString()} />
								<StatCell
									label="Total size"
									value={formatBytes(catalog.stats.totalSizeBytes)}
								/>
								<StatCell
									label="Arweave cost"
									value={formatUsd(catalog.stats.estimatedArweaveCostUsd)}
									hint="approx."
								/>
								<StatCell
									label="First mint"
									value={formatDate(catalog.stats.firstMintAt)}
								/>
							</div>

							{/* Handle preview — shown only when the input was an ENS name */}
							{ensHandleSeed && (
								<HandlePreview
									seed={ensHandleSeed}
									data={handlePreview.data ?? null}
									isLoading={handlePreview.isFetching}
								/>
							)}

							<p className="text-xs text-muted-foreground leading-relaxed">
								{catalog.limits.message}
							</p>

							{/* Catalog grid */}
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{catalog.pieces.map((p) => (
									<a
										key={`${p.contract}-${p.tokenId}`}
										href={p.foundationUrl ?? '#'}
										target="_blank"
										rel="noreferrer noopener"
										className="group block aspect-square rounded-lg overflow-hidden bg-card border border-border/60 hover:border-border transition-colors"
									>
										<PieceImage urls={p.imageUrls} alt={p.name ?? `Token ${p.tokenId}`} />
									</a>
								))}
							</div>
						</div>
					)}
					</div>

					{/* Signup / waitlist — always shown after a lookup. Three states:
					    1. Already authenticated → 1-click "flag interest" button
					    2. Not authenticated → primary "Sign up" CTA via Privy + collapsible email-only fallback
					    3. Already joined → handled by hasJoined branch below */}
					{showWaitlist && authenticated && (
						<section className="rounded-lg border border-border/60 bg-card p-6 space-y-4">
							<div className="space-y-1.5">
								<h2 className="text-xl font-semibold tracking-tight">
									Flag your preservation interest.
								</h2>
								<p className="text-sm text-muted-foreground">
									You’re signed in to Desperse. We’ll email you when migration tools open
									and you can claim preservation editions.
								</p>
							</div>
							<Button onClick={handleSignedInJoin} disabled={join.isPending}>
								{join.isPending ? (
									<Icon name="spinner-third" variant="regular" spin />
								) : (
									'Add me to the preservation list'
								)}
							</Button>
						</section>
					)}

					{showWaitlist && !authenticated && (
						<section className="rounded-lg border border-border/60 bg-card p-6 space-y-5">
							<div className="space-y-1.5">
								<h2 className="text-xl font-semibold tracking-tight">
									Lock in your spot.
								</h2>
								<p className="text-sm text-muted-foreground">
									Sign up to claim
									{ensHandleSeed ? (
										<>
											{' '}
											<span className="font-mono">@{ensHandleSeed}</span>
										</>
									) : (
										' your handle'
									)}
									, link this wallet for verification, and get notified when migration tools
									open. We don’t bridge or wrap your ETH NFTs — Desperse signs all
									transactions on Solana.
								</p>
							</div>
							<Button onClick={handleSignup} className="w-full sm:w-auto">
								Sign up with wallet or email
							</Button>

							{!emailExpanded ? (
								<button
									type="button"
									onClick={() => setEmailExpanded(true)}
									className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
								>
									Just want updates? Email-only signup
									<Icon name="arrow-right" variant="regular" className="text-[10px]" />
								</button>
							) : (
								<form onSubmit={handleEmailJoin} className="space-y-2 pt-2 border-t border-border/60">
									<label
										htmlFor="waitlist-email"
										className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground block"
									>
										Email-only — no account
									</label>
									<div className="flex flex-col sm:flex-row gap-2">
										<input
											id="waitlist-email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="you@example.com"
											className="flex-1 bg-background border border-border/60 rounded-sm px-4 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-border"
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
									{ethAddressFromInput && (
										<p className="text-xs text-muted-foreground font-mono">
											Linked to {ethAddressFromInput.slice(0, 6)}…{ethAddressFromInput.slice(-4)}
										</p>
									)}
								</form>
							)}
						</section>
					)}

					{hasJoined && (
						<div className="rounded-lg border border-border/60 bg-card p-6 flex items-start gap-3">
							<div className="size-9 rounded-full bg-tone-standard/20 grid place-items-center shrink-0">
								<Icon name="check" variant="regular" className="text-tone-standard" />
							</div>
							<div className="space-y-1">
								<p className="font-semibold">You’re on the list.</p>
								<p className="text-sm text-muted-foreground">
									We’ll reach out when migration tools go live.
								</p>
							</div>
						</div>
					)}

					{/* Footnote */}
					<section className="space-y-2 pt-8 border-t border-border/60">
						<p className="text-xs text-muted-foreground leading-relaxed max-w-[65ch]">
							Desperse does not host, wrap, mirror, or bridge your Ethereum NFTs. Your
							originals stay yours to keep, sell, or burn. Preservation editions are new
							Solana mints with Arweave-permanent media, cryptographically tied to your
							original work.
						</p>
					</section>
				</div>
			</main>

			<Footer showCta={false} />
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
				<span className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">
					Suggested handle
				</span>
				<span className="font-mono text-sm truncate">@{normalized}</span>
			</div>
			<div className="ml-auto flex items-center gap-2 text-xs">
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

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="rounded-lg bg-card border border-border/60 p-4 space-y-1">
			<div className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">
				{label}
			</div>
			<div className="text-xl md:text-2xl font-semibold tabular-nums">{value}</div>
			{hint && <div className="text-[10px] font-mono text-muted-foreground">{hint}</div>}
		</div>
	)
}
