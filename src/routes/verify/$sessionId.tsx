/**
 * Echoes holder verification page — /verify/$sessionId
 *
 * Opened from the one-time link the Discord bot DMs as an ephemeral reply.
 * The member signs a nonce-bound message (NOT a transaction) with the wallet
 * that holds their Echo; on success the bot grants the Echoes Holder + faction
 * roles. Connecting via Privy silently provisions a Desperse account, so this
 * works for marketplace buyers with no prior account.
 */

import { createFileRoute, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana'
import { useConnectWallet, usePrivy } from '@privy-io/react-auth'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { loadVerificationSession, submitVerification } from '@/server/functions/verification'

export const Route = createFileRoute('/verify/$sessionId')({
	component: VerifyPage,
})

type SessionInfo = { valid: boolean; message?: string; expiresAt?: string }

type SubmitState =
	| { kind: 'idle' }
	| { kind: 'working'; label: string }
	| { kind: 'success'; holds: boolean; factions: string[] }
	| { kind: 'error'; message: string }

function toBase64(bytes: Uint8Array): string {
	let binary = ''
	for (const b of bytes) binary += String.fromCharCode(b)
	return btoa(binary)
}

function truncate(address: string): string {
	return address.length <= 10 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`
}

function VerifyPage() {
	const { sessionId } = useParams({ from: '/verify/$sessionId' })
	const { isAuthenticated, isReady, getAccessToken } = useAuth()
	// Mounting this triggers silent Desperse account creation once Privy auths.
	useCurrentUser()
	const { login } = usePrivy()
	const { wallets, ready: walletsReady } = useWallets()
	const { connectWallet } = useConnectWallet()
	const { signMessage } = useSignMessage()

	const [session, setSession] = useState<SessionInfo | null>(null)
	const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
	const [state, setState] = useState<SubmitState>({ kind: 'idle' })

	useEffect(() => {
		let active = true
		loadVerificationSession({ data: { sessionId } } as never)
			.then((res) => {
				if (active) setSession(res as SessionInfo)
			})
			.catch(() => {
				if (active) setSession({ valid: false })
			})
		return () => {
			active = false
		}
	}, [sessionId])

	useEffect(() => {
		if (!selectedWallet && wallets.length > 0) setSelectedWallet(wallets[0].address)
	}, [wallets, selectedWallet])

	const handleVerify = async () => {
		if (!session?.message) return
		const wallet = wallets.find((w) => w.address === selectedWallet)
		if (!wallet) {
			setState({ kind: 'error', message: 'Select a wallet first.' })
			return
		}
		try {
			setState({ kind: 'working', label: 'Waiting for signature…' })
			const { signature } = await signMessage({
				message: new TextEncoder().encode(session.message),
				wallet,
			})
			setState({ kind: 'working', label: 'Verifying on-chain…' })
			const token = await getAccessToken()
			const res = (await submitVerification({
				data: {
					_authorization: token,
					sessionId,
					walletAddress: wallet.address,
					signature: toBase64(signature),
					message: session.message,
				},
			} as never)) as {
				success: boolean
				error?: string
				holdsEcho?: boolean
				factions?: string[]
			}
			if (!res.success) {
				setState({ kind: 'error', message: res.error || 'Verification failed.' })
				return
			}
			setState({ kind: 'success', holds: !!res.holdsEcho, factions: res.factions ?? [] })
		} catch (err) {
			setState({
				kind: 'error',
				message: err instanceof Error ? err.message : 'Something went wrong.',
			})
		}
	}

	return (
		<div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<h1 className="text-heading-2 text-foreground">Verify Echoes holder</h1>
				<p className="mt-2 text-body-sm text-muted-foreground">
					Sign a message to prove you own the wallet that holds your Echo. You are{' '}
					<strong className="text-foreground">not</strong> approving a transaction — no funds
					will move.
				</p>

				{/* Anti-phishing notice */}
				<div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-label-sm text-muted-foreground">
					Only ever verify on <strong className="text-foreground">desperse.com</strong>. We will
					never DM you a link or ask you to approve a transaction.
				</div>

				<div className="mt-6">{renderBody()}</div>
			</div>
		</div>
	)

	function renderBody() {
		if (session === null) {
			return <p className="text-body-sm text-muted-foreground">Loading verification…</p>
		}
		if (!session.valid) {
			return (
				<p className="text-body-sm text-destructive">
					This verification link is invalid, expired, or already used. Click{' '}
					<strong>Verify Wallet</strong> again in Discord to get a fresh link.
				</p>
			)
		}
		if (state.kind === 'success') {
			return (
				<div className="space-y-2">
					{state.holds ? (
						<>
							<p className="text-body-md font-semibold text-foreground">You're verified ✅</p>
							<p className="text-body-sm text-muted-foreground">
								Your Echoes Holder role has been granted
								{state.factions.length
									? `, along with: ${state.factions.join(', ')}`
									: ''}
								. You can close this tab and return to Discord.
							</p>
						</>
					) : (
						<>
							<p className="text-body-md font-semibold text-foreground">
								Wallet verified, but no Echo found
							</p>
							<p className="text-body-sm text-muted-foreground">
								We couldn't find an Echo in this wallet. If it's in a different wallet, run{' '}
								<strong>Verify Wallet</strong> again and connect that one.
							</p>
						</>
					)}
				</div>
			)
		}

		if (!isReady) {
			return <p className="text-body-sm text-muted-foreground">Starting up…</p>
		}

		if (!isAuthenticated) {
			return (
				<button
					type="button"
					onClick={() => login()}
					className="w-full rounded-lg bg-primary px-4 py-3 text-label-md font-medium text-primary-foreground transition-opacity hover:opacity-90"
				>
					Sign in to continue
				</button>
			)
		}

		const working = state.kind === 'working'

		return (
			<div className="space-y-4">
				{walletsReady && wallets.length > 0 ? (
					<div className="space-y-2">
						<p className="text-label-sm text-muted-foreground">Sign with the wallet holding your Echo:</p>
						<div className="space-y-1.5">
							{wallets.map((w) => (
								<button
									key={w.address}
									type="button"
									onClick={() => setSelectedWallet(w.address)}
									className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
										selectedWallet === w.address
											? 'border-primary bg-primary/5'
											: 'border-border hover:bg-muted/50'
									}`}
								>
									<span className="text-mono-sm text-foreground">{truncate(w.address)}</span>
									{selectedWallet === w.address && (
										<span className="text-label-sm text-primary">selected</span>
									)}
								</button>
							))}
						</div>
					</div>
				) : (
					<p className="text-body-sm text-muted-foreground">No wallet connected yet.</p>
				)}

				<button
					type="button"
					onClick={() => connectWallet({ walletChainType: 'solana-only' })}
					className="w-full rounded-lg border border-border px-4 py-2.5 text-label-sm text-foreground transition-colors hover:bg-muted/50"
				>
					Connect another wallet
				</button>

				<button
					type="button"
					disabled={working || !selectedWallet}
					onClick={handleVerify}
					className="w-full rounded-lg bg-primary px-4 py-3 text-label-md font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{working ? (state.kind === 'working' ? state.label : 'Working…') : 'Sign & verify'}
				</button>

				{state.kind === 'error' && (
					<p className="text-body-sm text-destructive">{state.message}</p>
				)}
			</div>
		)
	}
}
