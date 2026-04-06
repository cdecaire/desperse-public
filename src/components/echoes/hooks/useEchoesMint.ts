/**
 * Mint flow state machine for Echoes PFP mint.
 * Handles: build tx → sign → confirm → poll status.
 */

import { useState, useCallback } from "react"
import { useSignTransaction } from "@privy-io/react-auth/solana"
import { usePrivy } from "@privy-io/react-auth"
import { useQueryClient } from "@tanstack/react-query"
import { useActiveWallet } from "@/hooks/useActiveWallet"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type EchoesMintStep =
	| "idle"
	| "preparing"   // POST /pfp/mint
	| "signing"     // Privy wallet signing
	| "submitting"  // POST /pfp/confirm
	| "confirming"  // Polling GET /pfp/status/:mintId
	| "success"
	| "failed"

export interface EchoesMintState {
	step: EchoesMintStep
	mintId: string | null
	nftMintAddress: string | null
	txSignature: string | null
	error: string | null
}

const INITIAL_STATE: EchoesMintState = {
	step: "idle",
	mintId: null,
	nftMintAddress: null,
	txSignature: null,
	error: null,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEchoesMint() {
	const [state, setState] = useState<EchoesMintState>(INITIAL_STATE)
	const { getAccessToken, authenticated } = usePrivy()
	const { activePrivyWallet, activeAddress } = useActiveWallet()
	const { signTransaction } = useSignTransaction()
	const queryClient = useQueryClient()

	const mint = useCallback(async () => {
		if (!authenticated || !activePrivyWallet || !activeAddress) {
			const reason = !authenticated ? "Please create an account first" : !activePrivyWallet ? "No signing wallet found" : "No wallet address"
			setState({ ...INITIAL_STATE, step: "failed", error: reason })
			return
		}

		const accessToken = await getAccessToken()
		if (!accessToken) {
			setState({ ...INITIAL_STATE, step: "failed", error: "Authentication failed" })
			return
		}

		try {
			// Step 1: Build transaction
			setState({ ...INITIAL_STATE, step: "preparing" })

			const buildRes = await fetch("/api/v1/pfp/mint", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ walletAddress: activeAddress }),
			})

			const buildJson = await buildRes.json() as {
				success: boolean
				data?: { mintId: string; unsignedTxBase64: string; blockhash: string; lastValidBlockHeight: number; phase: string; price: { lamports: number; sol: number; display: string } | null }
				error?: { code: string; message: string }
			}

			if (!buildRes.ok || !buildJson.success || !buildJson.data) {
				setState({
					...INITIAL_STATE,
					step: "failed",
					error: buildJson.error?.message ?? "Failed to build mint transaction",
				})
				return
			}

			const { mintId, unsignedTxBase64, price } = buildJson.data

			// Step 2: Sign with Privy wallet
			setState((s) => ({ ...s, step: "signing", mintId }))

			const txBytes = Uint8Array.from(atob(unsignedTxBase64), (c) => c.charCodeAt(0))

			// Sign with Privy's useSignTransaction hook — shows fee info in the confirmation modal
			const priceLabel = price ? price.display : "Free"
			const { signedTransaction } = await signTransaction({
				transaction: txBytes,
				wallet: activePrivyWallet,
				chain: "solana:devnet",
				options: {
					uiOptions: {
						description: `Mint Echoes PFP — ${priceLabel}`,
					},
				},
			})

			const signedTxBase64 = btoa(
				String.fromCharCode(...signedTransaction),
			)

			// Step 3: Submit signed tx
			setState((s) => ({ ...s, step: "submitting" }))

			const confirmRes = await fetch("/api/v1/pfp/confirm", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ mintId, signedTxBase64 }),
			})

			const confirmJson = await confirmRes.json() as {
				success: boolean
				data?: { status: string; txSignature: string }
				error?: { code: string; message: string }
			}

			if (!confirmRes.ok || !confirmJson.success) {
				setState((s) => ({
					...s,
					step: "failed",
					error: confirmJson.error?.message ?? "Failed to submit transaction",
				}))
				return
			}

			const txSignature = confirmJson.data?.txSignature ?? null

			// Step 4: Poll for confirmation
			setState((s) => ({ ...s, step: "confirming", txSignature }))

			const confirmed = await pollMintStatus(mintId, accessToken)

			if (confirmed.status === "confirmed") {
				setState({
					step: "success",
					mintId,
					nftMintAddress: confirmed.nftMintAddress,
					txSignature,
					error: null,
				})
				// Invalidate mint info + user mints + minted items queries to refresh
				queryClient.invalidateQueries({ queryKey: ["pfp-mint-status"] })
				queryClient.invalidateQueries({ queryKey: ["pfp-user-mints"] })
				queryClient.invalidateQueries({ queryKey: ["pfp-minted-items"] })
			} else {
				setState((s) => ({
					...s,
					step: "failed",
					error: confirmed.error ?? "Transaction failed",
				}))
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error"
			console.error("[useEchoesMint] Error:", message)
			setState((s) => ({
				...s,
				step: "failed",
				error: message,
			}))
		}
	}, [authenticated, getAccessToken, activePrivyWallet, activeAddress, queryClient])

	const reset = useCallback(() => {
		setState(INITIAL_STATE)
	}, [])

	return {
		...state,
		mint,
		reset,
		walletConnected: !!activePrivyWallet,
	}
}

// ---------------------------------------------------------------------------
// Polling helper
// ---------------------------------------------------------------------------

async function pollMintStatus(
	mintId: string,
	accessToken: string,
	maxAttempts = 12,
	intervalMs = 5000,
): Promise<{ status: string; nftMintAddress: string | null; error: string | null }> {
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((resolve) => setTimeout(resolve, intervalMs))

		try {
			const res = await fetch(`/api/v1/pfp/status/${mintId}`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})

			const json = await res.json() as {
				success: boolean
				data?: { status: string; nftMintAddress: string | null; error: string | null }
			}

			if (json.success && json.data) {
				if (json.data.status === "confirmed" || json.data.status === "failed") {
					return json.data
				}
			}
		} catch {
			// Continue polling on network errors
		}
	}

	return { status: "failed", nftMintAddress: null, error: "Confirmation timed out" }
}
