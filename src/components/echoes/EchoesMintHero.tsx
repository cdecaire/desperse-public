import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useConnectWallet } from "@privy-io/react-auth"
import { Link } from "@tanstack/react-router"
import { useCountdown, pad } from "./hooks/useCountdown"
import { useMintPhase } from "./hooks/useMintPhase"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useEchoesMint } from "./hooks/useEchoesMint"
import { useEchoesMintInfo } from "./hooks/useEchoesMintInfo"
import { getNextPhase } from "./hooks/useNextPhase"
import { useUserEchoesMints } from "./hooks/useUserEchoesMints"
import { EchoesMintSuccess } from "./EchoesMintSuccess"
import { MintHeroCards } from "./EchoesArchive"

export function EchoesMintHero() {
	const phase = useMintPhase()
	const queryClient = useQueryClient()
	const { data: mintInfoForCountdown } = useEchoesMintInfo()

	// Find the nearest future phase start for the countdown
	const nextPhase = getNextPhase(mintInfoForCountdown?.windows)
	const hasCountdownTarget = !!nextPhase
	const countdownTarget = nextPhase ? new Date(nextPhase.date) : new Date(0)
	const onCountdownComplete = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["pfp-mint-status"] })
	}, [queryClient])
	const { days, hours, minutes, seconds } = useCountdown(countdownTarget, onCountdownComplete)
	const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1 })
	const { step, mint, reset, error, walletConnected, nftMintAddress } = useEchoesMint()
	const { connectWallet } = useConnectWallet()
	const { data: mintInfo } = useEchoesMintInfo()
	const { data: userMints } = useUserEchoesMints()
	const [viewingMint, setViewingMint] = useState<string | null>(null)

	const isMinting = step === "preparing" || step === "signing" || step === "submitting" || step === "confirming"
	const isSoldOut = mintInfo?.supply ? mintInfo.supply.remaining <= 0 : false
	const isEligible = mintInfo?.isEligible ?? true // default true while loading
	const mintButtonLabel =
		isSoldOut ? "SOLD OUT" :
		step === "preparing" ? "BUILDING TX..." :
		step === "signing" ? "SIGN IN WALLET" :
		step === "submitting" ? "SUBMITTING..." :
		step === "confirming" ? "CONFIRMING..." :
		step === "success" ? "MINTED!" :
		!walletConnected ? "CONNECT WALLET" :
		!isEligible ? "NOT ELIGIBLE" :
		"MINT NOW"

	// Only show user's mints when CM is live or postmint — premint has no valid CM
	const mintAddresses = phase !== "premint" ? (userMints?.map((m) => m.nftMintAddress) ?? []) : []

	return (
		<header ref={heroRef} className="relative min-h-[70vh] flex flex-col justify-center pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-20 nx-bg-surface-lowest overflow-hidden" aria-label="Mint">
			{/* Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,191,166,0.03)] via-transparent to-[rgba(212,136,42,0.02)] pointer-events-none" aria-hidden="true" />

			<div className="relative z-10 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

			{/* Left column — existing hero content */}
			<div className="lg:col-span-7">
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-4" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
					{phase === "premint" && "MINT_PROTOCOL // AWAITING BREACH WINDOW"}
					{phase === "minting" && "MINT_PROTOCOL // BREACH WINDOW ACTIVE"}
					{phase === "postmint" && "MINT_PROTOCOL // ARCHIVE RESOLVED"}
				</span>

				<h1 className="font-headline text-4xl sm:text-6xl md:text-8xl tracking-[-0.05em] leading-[1.1] mb-6 uppercase" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
					{phase === "premint" && (
						<>RECOVER AN <span className="nx-text-primary-container">ECHO</span></>
					)}
					{phase === "minting" && (
						<>MINT <span className="nx-text-primary-container">LIVE</span></>
					)}
					{phase === "postmint" && (
						<>IDENTITIES <span className="nx-text-primary-container">RESOLVED</span></>
					)}
				</h1>

				<p className="font-body text-base md:text-xl max-w-2xl mb-8 md:mb-12 pl-4 md:pl-6 nx-text-on-surface-variant border-l-2 border-[var(--nx-primary-container)]" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
					{phase === "premint" &&
						"Every Echo was already in the archive — scattered by the 3E Cascade, waiting to be recovered. Shaped by faction, signal exposure, and survival inside Tessera. The breach window has not yet opened."}
					{phase === "minting" &&
						"The breach window is open. These identities were already in the archive — you are pulling them out. Each Echo resolves on mint. You are the reason they come back."}
					{phase === "postmint" &&
						"The archive has been reconstructed. View your recovered identity and explore the collection."}
				</p>

				<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
					{/* Countdown / Status */}
					<div className="p-4 md:p-6 min-w-0 sm:min-w-[240px] nx-bg-surface-high border-l-4 border-[var(--nx-primary-container)]">
						{phase === "premint" && (
							<>
								<span className="block font-label text-[10px] tracking-widest mb-2 uppercase nx-text-primary-fixed">
									{hasCountdownTarget ? `${nextPhase!.label} IN` : "BREACH WINDOW"}
								</span>
								<div
									className="font-headline text-3xl md:text-4xl tracking-tighter"
									suppressHydrationWarning
									aria-label={hasCountdownTarget ? `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds` : "To be announced"}
								>
									{hasCountdownTarget
										? <>{pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}</>
										: <span className="nx-text-primary-container">TBA</span>
									}
								</div>
							</>
						)}
						{phase === "minting" && (
							<>
								<span className="block font-label text-[10px] tracking-widest mb-1 uppercase nx-text-secondary-container">
									{mintInfo?.phase === "og-free" ? "OG FREE MINT" :
									 mintInfo?.phase === "og-discount" ? "OG DISCOUNT MINT" :
									 mintInfo?.phase === "whitelist" ? "WHITELIST MINT" :
									 mintInfo?.phase === "public" ? "PUBLIC MINT" :
									 "BREACH WINDOW"}: ACTIVE
								</span>
								<div className="font-headline text-2xl nx-text-primary-container">
									{mintInfo?.supply ? `${mintInfo.supply.minted} / ${mintInfo.supply.total}` : "MINTING NOW"}
								</div>
								<span className="block font-label text-[9px] tracking-widest mt-2 uppercase nx-text-outline">
									{mintInfo?.phase === "og-free" || mintInfo?.phase === "og-discount"
										? "ELIGIBLE: OG HOLDERS"
										: mintInfo?.phase === "whitelist"
										? "ELIGIBLE: WHITELISTED WALLETS"
										: mintInfo?.phase === "public"
										? "ELIGIBLE: ALL WALLETS"
										: null}
								</span>
								{/* Countdown to next phase */}
								{hasCountdownTarget && (
									<div className="mt-3 pt-3 border-t nx-border-subtle">
										<span className="block font-label text-[9px] tracking-widest mb-1 uppercase nx-text-outline">
											{nextPhase!.label} IN
										</span>
										<div className="font-headline text-lg tracking-tighter nx-text-on-surface-variant" suppressHydrationWarning>
											{pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
										</div>
									</div>
								)}
							</>
						)}
						{phase === "postmint" && (
							<>
								<span className="block font-label text-[10px] tracking-widest mb-2 uppercase nx-text-outline">
									ARCHIVE STATUS
								</span>
								<div className="font-headline text-2xl">
									RESOLVED
								</div>
							</>
						)}
					</div>

					{/* CTA */}
					{phase === "premint" && (
						<button
							type="button"
							disabled
							className="font-headline text-base md:text-lg px-8 md:px-10 py-4 md:py-5 min-h-[48px] uppercase opacity-50 cursor-not-allowed nx-bg-surface-high nx-text-outline border nx-border-subtle"
						>
							COMING SOON
						</button>
					)}
					{phase === "minting" && (
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={isSoldOut || (walletConnected && !isEligible) ? undefined : !walletConnected ? () => connectWallet({ walletChainType: "solana-only" }) : step === "success" ? reset : mint}
								disabled={isMinting || isSoldOut || (walletConnected && !isEligible)}
								className={`font-headline text-base md:text-lg px-8 md:px-10 py-4 md:py-5 min-h-[48px] uppercase ${
									isSoldOut || (walletConnected && !isEligible) ? "opacity-50 cursor-not-allowed nx-bg-surface-high nx-text-outline border nx-border-subtle" :
									isMinting ? "opacity-70 cursor-wait nx-bg-primary-container nx-text-on-primary-fixed" :
									step === "success" ? "nx-bg-secondary-container nx-text-on-primary-fixed skew-hover" :
									"skew-hover nx-bg-primary-container nx-text-on-primary-fixed"
								}`}
							>
								{isSoldOut ? "SOLD OUT" : step === "success" ? "MINT ANOTHER" : mintButtonLabel}
							</button>
							{walletConnected && !isEligible && step === "idle" && (
								<span className="font-label text-[10px] tracking-widest uppercase nx-text-outline">
									{mintInfo?.phase === "og-free" || mintInfo?.phase === "og-discount"
										? "YOUR WALLET IS NOT ON THE OG LIST"
										: mintInfo?.phase === "whitelist"
										? "YOUR WALLET IS NOT ON THE WHITELIST"
										: "YOUR WALLET IS NOT ELIGIBLE FOR THIS PHASE"}
								</span>
							)}
							{step === "failed" && error && (
								<div className="flex items-center gap-2">
									<span className="font-label text-[10px] tracking-widest uppercase text-red-400">{error}</span>
									<button type="button" onClick={reset} className="font-label text-[10px] tracking-widest uppercase nx-text-primary-container hover:underline">
										RETRY
									</button>
								</div>
							)}
							{step === "success" && nftMintAddress && (
								<span className="font-label text-[10px] tracking-widest uppercase nx-text-primary-container">
									ECHO RECOVERED // {nftMintAddress.slice(0, 8)}...
								</span>
							)}
						</div>
					)}
					{phase === "postmint" && (
						<Link
							to="/echoes/collection"
							className="font-headline text-base md:text-lg px-8 md:px-10 py-4 md:py-5 min-h-[48px] uppercase skew-hover nx-bg-primary-container nx-text-on-primary-fixed inline-flex items-center"
						>
							VIEW COLLECTION
						</Link>
					)}
				</div>
			</div>

			{/* Right column — cards */}
			<div className="hidden lg:block lg:col-span-5" data-reveal-stagger style={{ "--stagger-index": 4 } as React.CSSProperties}>
				<MintHeroCards
					mintAddresses={mintAddresses}
					onCardClick={setViewingMint}
				/>
			</div>

			</div>

			{/* Mint confirm + reveal modal */}
			{(step === "confirming" || step === "success") && (
				<EchoesMintSuccess
					nftMintAddress={nftMintAddress}
					mintStep={step}
					onClose={reset}
					onMintAnother={() => { reset(); setTimeout(mint, 100) }}
				/>
			)}
			{/* Archive card view modal */}
			{viewingMint && (
				<EchoesMintSuccess
					nftMintAddress={viewingMint}
					mintStep="success"
					onClose={() => setViewingMint(null)}
					onMintAnother={() => setViewingMint(null)}
					skipAnimation
					viewMode
					onPrev={mintAddresses.indexOf(viewingMint) > 0 ? () => setViewingMint(mintAddresses[mintAddresses.indexOf(viewingMint) - 1]) : undefined}
					onNext={mintAddresses.indexOf(viewingMint) < mintAddresses.length - 1 ? () => setViewingMint(mintAddresses[mintAddresses.indexOf(viewingMint) + 1]) : undefined}
				/>
			)}
		</header>
	)
}
